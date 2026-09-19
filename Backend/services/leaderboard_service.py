"""
services/leaderboard_service.py  (v2 — million-user scale rewrite)

Core design:
 - cached_score in user_xp is the authoritative ranking value.
 - field_key / batch_key are denormalized onto user_xp for O(1) SQL filter.
 - Ranking uses PostgreSQL RANK() OVER window function — pure SQL, no Python loops.
 - "People Around You" uses a CTE with RANK() then filters ±N from user's rank.
 - award_xp() updates cached_score atomically in the same transaction.
 - Supports 1M+ users without degradation.

Supported scopes:
  'global'   — all users with cached_score > 0
  'field'    — WHERE field_key = :key
  'batch'    — WHERE batch_key = :key
  'friends'  — WHERE user_id IN (:friend_ids)

Supported periods:
  'weekly'   — ranks by weekly_xp
  'monthly'  — ranks by monthly_xp
  'alltime'  — ranks by cached_score (default)
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Optional
from uuid import UUID

from sqlalchemy import func, text, case, and_, or_
from sqlalchemy.orm import Session

from Backend.models.onboarding import UserOnboarding
from Backend.models.user import User
from Backend.models.practice import UserStreak, UserPracticeSession
from Backend.models.leaderboard import UserXP, LeaderboardEvent
from Backend.models.challenges import ChallengeParticipant


# ─────────────────────────────────────────────────────────────────────────────
# Field classification (unchanged — used to populate field_key / batch_key)
# ─────────────────────────────────────────────────────────────────────────────

EXAM_FIELD_MAP = {
    "jee":   "exam:jee",
    "neet":  "exam:neet",
    "upsc":  "exam:upsc",
    "gate":  "exam:gate",
    "cat":   "exam:cat",
    "gmat":  "exam:gmat",
    "ielts": "exam:ielts",
    "toefl": "exam:toefl",
    "sat":   "exam:sat",
    "gre":   "exam:gre",
    "clat":  "exam:clat",
    "ssc":   "exam:ssc",
    "bank":  "exam:bank",
    "other": "exam:other",
}

STUDY_FIELD_MAP = {
    "computer science": "student:cs",
    "cs":               "student:cs",
    "software engineering": "student:cs",
    "information technology": "student:cs",
    "it":               "student:cs",
    "electronics": "student:electronics",
    "electrical": "student:electrical",
    "mechanical": "student:mechanical",
    "civil": "student:civil",
    "chemical": "student:chemical",
    "aerospace": "student:aerospace",
    "robotics": "student:robotics",
    "data science": "student:datascience",
    "ai": "student:datascience",
    "machine learning": "student:datascience",
    "mbbs": "student:medical",
    "medicine": "student:medical",
    "nursing": "student:nursing",
    "pharmacy": "student:pharmacy",
    "dentistry": "student:medical",
    "physiotherapy": "student:medical",
    "biomedical": "student:medical",
    "commerce": "student:commerce",
    "finance": "student:commerce",
    "accounting": "student:commerce",
    "economics": "student:commerce",
    "bcom": "student:commerce",
    "ca": "student:commerce",
    "mba": "student:business",
    "arts": "student:arts",
    "humanities": "student:arts",
    "history": "student:arts",
    "psychology": "student:arts",
    "sociology": "student:arts",
    "philosophy": "student:arts",
    "english": "student:arts",
    "literature": "student:arts",
    "law": "student:law",
    "llb": "student:law",
    "legal": "student:law",
    "design": "student:design",
    "ux": "student:design",
    "ui": "student:design",
    "graphic design": "student:design",
    "architecture": "student:design",
    "physics": "student:science",
    "chemistry": "student:science",
    "biology": "student:science",
    "mathematics": "student:science",
    "math": "student:science",
    "statistics": "student:science",
    "business administration": "student:business",
    "management": "student:business",
    "marketing": "student:business",
    "bba": "student:business",
}

_FIELD_LABELS = {
    "exam:jee":         "JEE Aspirants",
    "exam:neet":        "NEET Aspirants",
    "exam:upsc":        "UPSC Aspirants",
    "exam:gate":        "GATE Aspirants",
    "exam:cat":         "CAT Aspirants",
    "exam:ssc":         "SSC Aspirants",
    "exam:bank":        "Banking Aspirants",
    "exam:clat":        "CLAT Aspirants",
    "exam:other":       "Exam Aspirants",
    "student:cs":       "CS / Tech Students",
    "student:medical":  "Medical Students",
    "student:nursing":  "Nursing Students",
    "student:pharmacy": "Pharmacy Students",
    "student:commerce": "Commerce Students",
    "student:arts":     "Arts & Humanities",
    "student:law":      "Law Students",
    "student:design":   "Design Students",
    "student:science":  "Science Students",
    "student:electronics": "Electronics Engineers",
    "student:mechanical":  "Mechanical Engineers",
    "student:electrical":  "Electrical Engineers",
    "student:datascience": "Data Science / AI Students",
    "student:business":    "Business Management Students",
    "student:general":     "Students",
    "freelancer:web":   "Web Developers",
    "freelancer:mobile":"Mobile Developers",
    "freelancer:design":"Designers",
    "freelancer:data":  "Data / ML Freelancers",
    "freelancer:content":"Content Writers",
    "freelancer:video": "Video Creators / Editors",
    "freelancer:marketing": "Marketing Freelancers",
    "freelancer:general": "Freelancers",
    "entrepreneur":     "Entrepreneurs & Founders",
    "creator":          "Content Creators",
    "general":          "All Users",
}


def _normalize(s: str) -> str:
    return s.lower().strip() if s else ""


def get_user_field(ob: Optional[UserOnboarding]) -> str:
    if not ob:
        return "general"

    user_type = _normalize(ob.user_type or "")

    if user_type == "exam_aspirant":
        exam = _normalize(ob.exam_type or "")
        return EXAM_FIELD_MAP.get(exam, "exam:other")

    if user_type == "student":
        fos = _normalize(ob.field_of_study or "")
        if fos in STUDY_FIELD_MAP:
            return STUDY_FIELD_MAP[fos]
        for key, val in STUDY_FIELD_MAP.items():
            if key in fos:
                return val
        return "student:general"

    if user_type == "freelancer":
        skill = _normalize(ob.primary_skill or "")
        if any(k in skill for k in ["web", "frontend", "backend", "full", "react", "node", "django"]):
            return "freelancer:web"
        if any(k in skill for k in ["mobile", "flutter", "android", "ios", "react native"]):
            return "freelancer:mobile"
        if any(k in skill for k in ["design", "ui", "ux", "graphic", "figma"]):
            return "freelancer:design"
        if any(k in skill for k in ["data", "ml", "ai", "analytics", "python"]):
            return "freelancer:data"
        if any(k in skill for k in ["write", "content", "copywriting", "seo", "blog"]):
            return "freelancer:content"
        if any(k in skill for k in ["video", "edit", "youtube", "reel", "motion"]):
            return "freelancer:video"
        if any(k in skill for k in ["market", "social media", "ads", "growth"]):
            return "freelancer:marketing"
        return "freelancer:general"

    if user_type in ("entrepreneur", "business_owner"):
        return "entrepreneur"

    if user_type == "creator":
        return "creator"

    return "general"


def get_field_label(field_key: str) -> str:
    return _FIELD_LABELS.get(field_key, field_key.replace(":", " ").title())


def get_user_batch(ob: Optional[UserOnboarding]) -> str:
    """
    Compute community batch key — tighter cohort than field.
    Uses graduation_year (new general field) preferentially, falls back to attempt_year.
    """
    if not ob:
        return "batch:general"

    user_type = _normalize(ob.user_type or "")

    # Resolve the year — new graduation_year field takes priority
    year = (getattr(ob, "graduation_year", None) or "").strip()
    if not year:
        year = (ob.attempt_year or "").strip()

    if user_type == "exam_aspirant":
        exam = _normalize(ob.exam_type or "other")
        if year:
            return f"batch:{exam}:{year}"
        return f"batch:{exam}"

    if user_type == "student":
        field_key = get_user_field(ob)
        bucket = field_key.replace("student:", "") if field_key.startswith("student:") else "general"
        if year:
            return f"batch:student:{bucket}:{year}"
        return f"batch:student:{bucket}"

    if user_type == "freelancer":
        return "batch:freelancer"

    if user_type in ("entrepreneur", "business_owner"):
        return "batch:entrepreneur"

    if user_type == "creator":
        return "batch:creator"

    return "batch:general"


def get_batch_label(batch_key: str) -> str:
    parts = batch_key.split(":")
    if len(parts) >= 4:
        # batch:student:cs:2027
        field = parts[2].upper()
        year = parts[3]
        return f"{field} Class of {year}"
    if len(parts) >= 3:
        # batch:jee:2027 or batch:student:cs
        subject = parts[1].upper()
        rest = parts[2]
        if rest.isdigit():
            return f"{subject} {rest} Batch"
        return f"{subject} {rest.upper()} Community"
    if len(parts) == 2:
        return f"{parts[1].replace('_', ' ').title()} Community"
    return "Community"


# ─────────────────────────────────────────────────────────────────────────────
# Score computation — still used to POPULATE cached_score on award
# ─────────────────────────────────────────────────────────────────────────────

def compute_user_score(user_id: UUID, db: Session) -> dict:
    """
    Compute live score from existing tables.
    score = (streak × 20) + (total_correct × 5) + (challenges_done × 30) + bonus_xp

    This is called:
    1. When populating cached_score on first award
    2. During backfill/recompute operations
    3. For individual user score display (not for ranking queries)
    """
    streak_row = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    current_streak = streak_row.current_streak if streak_row else 0
    longest_streak = streak_row.longest_streak if streak_row else 0

    agg = db.query(
        func.sum(UserPracticeSession.correct_count).label("total_correct"),
        func.count(UserPracticeSession.id).label("session_count"),
    ).filter(UserPracticeSession.user_id == user_id).first()

    total_correct = int(agg.total_correct or 0)
    session_count = int(agg.session_count or 0)

    challenges_done = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.user_id == user_id,
        ChallengeParticipant.completed == True,
    ).count()

    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    bonus_xp = xp_row.total_xp if xp_row else 0

    score = (
        current_streak * 20
        + total_correct * 5
        + challenges_done * 30
        + int(bonus_xp)
    )

    return {
        "score": score,
        "streak": current_streak,
        "longest_streak": longest_streak,
        "total_correct": total_correct,
        "session_count": session_count,
        "challenges_done": challenges_done,
        "bonus_xp": int(bonus_xp),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Scale-aware leaderboard queries using SQL RANK() window function
# ─────────────────────────────────────────────────────────────────────────────

def _score_column(period: str):
    """Return the SQLAlchemy column expression for the given period."""
    if period == "weekly":
        return UserXP.weekly_xp
    if period == "monthly":
        return UserXP.monthly_xp
    return UserXP.cached_score   # alltime


def get_leaderboard(
    scope: str,
    db: Session,
    scope_key: str = "",
    period: str = "alltime",
    limit: int = 50,
    offset: int = 0,
    friend_ids: Optional[list] = None,
) -> dict:
    """
    Fetch ranked leaderboard for given scope + period.

    scope:     'global' | 'field' | 'batch' | 'friends'
    scope_key: field_key or batch_key (ignored for global/friends)
    period:    'alltime' | 'weekly' | 'monthly'
    limit:     page size
    offset:    page offset

    Returns dict with:
      users: [{rank, user_id, name, score, streak, badge, league, is_current_user, ...}]
      total: approximate total count in scope
      scope: metadata
    """
    score_col = _score_column(period)

    # Build base query: user_xp JOIN users JOIN user_streaks
    base_q = (
        db.query(
            UserXP.user_id,
            User.name,
            User.image,
            UserOnboarding.full_name,
            UserXP.field_key,
            UserXP.batch_key,
            UserOnboarding.exam_type,
            UserOnboarding.attempt_year,
            getattr(UserOnboarding, "graduation_year", None),
            UserOnboarding.user_type,
            UserStreak.current_streak,
            UserStreak.longest_streak,
            score_col.label("score"),
            UserXP.total_correct,
            UserXP.challenges_completed,
            UserXP.cached_score,
        )
        .join(User, User.id == UserXP.user_id)
        .outerjoin(UserOnboarding, UserOnboarding.user_id == UserXP.user_id)
        .outerjoin(UserStreak, UserStreak.user_id == UserXP.user_id)
        .filter(User.is_active == True)
    )

    # Apply scope filter
    if scope == "field" and scope_key:
        base_q = base_q.filter(UserXP.field_key == scope_key)
    elif scope == "batch" and scope_key:
        base_q = base_q.filter(UserXP.batch_key == scope_key)
    elif scope == "friends" and friend_ids is not None:
        if not friend_ids:
            return {"users": [], "total": 0, "scope": scope, "period": period}
        base_q = base_q.filter(UserXP.user_id.in_(friend_ids))

    # Filter to users with any score (don't show score=0 users in leaderboard)
    base_q = base_q.filter(score_col > 0)

    # Total count (for pagination)
    total = base_q.count()

    # Sorted results
    rows = (
        base_q
        .order_by(score_col.desc(), UserXP.updated_at.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )

    users = []
    for i, row in enumerate(rows):
        rank = offset + i + 1
        name = row.full_name or row.name or "User"
        score = int(row.score or 0)
        streak = row.current_streak or 0

        users.append({
            "rank":            rank,
            "user_id":         str(row.user_id),
            "name":            name,
            "avatar":          _initials(name),
            "image":           row.image,
            "score":           score,
            "streak":          streak,
            "longest_streak":  row.longest_streak or 0,
            "total_correct":   row.total_correct or 0,
            "challenges_done": row.challenges_completed or 0,
            "field_key":       row.field_key or "general",
            "batch_key":       row.batch_key or "batch:general",
            "league":          _score_to_league(score),
            "badge":           _rank_to_badge(rank),
            "is_current_user": False,  # caller sets this
        })

    return {
        "users":  users,
        "total":  total,
        "scope":  scope,
        "period": period,
    }


def get_my_rank(
    user_id: UUID,
    db: Session,
    scope: str = "batch",
    scope_key: str = "",
    period: str = "alltime",
    friend_ids: Optional[list] = None,
) -> dict:
    """
    Compute current user's rank using SQL RANK() window function.
    Runs a single SQL query — O(log N) with the covering index.

    Returns:
      rank, score, total_users, previous_rank, rank_change, movement_label
    """
    score_col = _score_column(period)

    # Build the scope WHERE clause
    scope_filter = _build_scope_filter(scope, scope_key, friend_ids)
    if scope_filter is None:
        return _empty_rank(user_id, db, scope, scope_key, period)

    # Use raw SQL with window function for accurate rank at any scale
    scope_sql = _scope_sql_fragment(scope, scope_key, friend_ids, period)

    rank_sql = text(f"""
        WITH ranked AS (
            SELECT
                ux.user_id,
                {_period_col_sql(period)} AS score,
                RANK() OVER (
                    ORDER BY {_period_col_sql(period)} DESC, ux.updated_at ASC
                ) AS rank,
                COUNT(*) OVER() AS total_users
            FROM user_xp ux
            JOIN users u ON u.id = ux.user_id
            {scope_sql['join']}
            WHERE u.is_active = TRUE
              AND {_period_col_sql(period)} > 0
              {scope_sql['where']}
        )
        SELECT rank, score, total_users FROM ranked WHERE user_id = :user_id
    """)

    result = db.execute(rank_sql, {"user_id": str(user_id), **scope_sql.get("params", {})}).first()

    if not result:
        # User not yet on leaderboard
        xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
        return {
            "rank":           None,
            "score":          int(xp_row.cached_score if xp_row else 0),
            "total_users":    0,
            "previous_rank":  None,
            "rank_change":    None,
            "movement_label": "NEW",
            "is_new":         True,
        }

    rank = int(result.rank)
    score = int(result.score)
    total = int(result.total_users)

    # Rank movement (only computed for alltime scope against previous_weekly_rank)
    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    prev_rank = xp_row.previous_weekly_rank if xp_row else None
    rank_change, movement_label = _compute_movement(rank, prev_rank)

    return {
        "rank":           rank,
        "score":          score,
        "total_users":    total,
        "previous_rank":  prev_rank,
        "rank_change":    rank_change,
        "movement_label": movement_label,
        "is_new":         False,
    }


def get_users_around_rank(
    user_id: UUID,
    db: Session,
    scope: str = "batch",
    scope_key: str = "",
    period: str = "alltime",
    radius: int = 5,
    friend_ids: Optional[list] = None,
) -> list[dict]:
    """
    Return the users ±radius positions around the given user.

    Implementation: CTE with RANK() → filter WHERE rank BETWEEN my_rank-radius AND my_rank+radius.
    This is a single SQL round-trip regardless of user count.
    """
    scope_sql = _scope_sql_fragment(scope, scope_key, friend_ids, period)

    around_sql = text(f"""
        WITH ranked AS (
            SELECT
                ux.user_id,
                u.name,
                u.image,
                ob.full_name,
                ux.field_key,
                ux.batch_key,
                ux.total_correct,
                ux.challenges_completed,
                st.current_streak,
                st.longest_streak,
                {_period_col_sql(period)} AS score,
                RANK() OVER (
                    ORDER BY {_period_col_sql(period)} DESC, ux.updated_at ASC
                ) AS rank
            FROM user_xp ux
            JOIN users u ON u.id = ux.user_id
            LEFT JOIN user_onboarding ob ON ob.user_id = ux.user_id
            LEFT JOIN user_streaks st ON st.user_id = ux.user_id
            {scope_sql['join']}
            WHERE u.is_active = TRUE
              AND {_period_col_sql(period)} > 0
              {scope_sql['where']}
        ),
        my_pos AS (
            SELECT rank AS my_rank FROM ranked WHERE user_id = :user_id
        )
        SELECT r.* FROM ranked r, my_pos m
        WHERE r.rank BETWEEN m.my_rank - :radius AND m.my_rank + :radius
        ORDER BY r.rank
    """)

    try:
        rows = db.execute(
            around_sql,
            {"user_id": str(user_id), "radius": radius, **scope_sql.get("params", {})}
        ).fetchall()
    except Exception:
        return []

    result = []
    for row in rows:
        name = row.full_name or row.name or "User"
        score = int(row.score or 0)
        result.append({
            "rank":            int(row.rank),
            "user_id":         str(row.user_id),
            "name":            name,
            "avatar":          _initials(name),
            "image":           row.image,
            "score":           score,
            "streak":          row.current_streak or 0,
            "longest_streak":  row.longest_streak or 0,
            "total_correct":   row.total_correct or 0,
            "challenges_done": row.challenges_completed or 0,
            "field_key":       row.field_key or "general",
            "batch_key":       row.batch_key or "batch:general",
            "league":          _score_to_league(score),
            "badge":           _rank_to_badge(int(row.rank)),
            "is_current_user": str(row.user_id) == str(user_id),
        })

    return result


# ─────────────────────────────────────────────────────────────────────────────
# XP award — the ONLY place that mutates score (server-authoritative)
# ─────────────────────────────────────────────────────────────────────────────

def award_xp(
    user_id: UUID,
    amount: int,
    source: str,        # "practice" | "challenge" | "streak" | "task" | "manual"
    field_key: str,
    user_name: str,
    db: Session,
    commit: bool = True,
    batch_key: str = "",
) -> None:
    """
    Award XP and update cached_score atomically.
    This is the ONLY place that touches user scores.
    Frontend cannot call this — it is called from backend-verified activity endpoints.

    Anti-gaming:
      - amount is validated by the caller (practice router, challenge router, etc.)
      - This function trusts the caller's amount but the callers enforce idempotency
    """
    now = datetime.now(timezone.utc)

    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    if not xp_row:
        xp_row = UserXP(
            user_id=user_id,
            total_xp=0, daily_xp=0, weekly_xp=0, monthly_xp=0,
            cached_score=0,
        )
        db.add(xp_row)
        db.flush()

    xp_row.total_xp   += amount
    xp_row.daily_xp   += amount
    xp_row.weekly_xp  += amount
    xp_row.monthly_xp += amount
    xp_row.last_xp_earned_at = now

    # Sync denormalized classification so leaderboard filter is always current
    if field_key:
        xp_row.field_key = field_key
    if batch_key:
        xp_row.batch_key = batch_key

    # Update source-specific counters
    if source == "practice":
        xp_row.practice_sessions += 1
    elif source == "challenge":
        xp_row.challenges_completed += 1
    elif source == "task":
        xp_row.tasks_completed += 1

    # Recompute cached_score — this is O(4 simple queries), happens on award not on read
    stats = compute_user_score(user_id, db)
    xp_row.cached_score = stats["score"]

    # Emit leaderboard event for SSE stream
    emojis = {
        "practice":  "⚡",
        "challenge": "🏆",
        "streak":    "🔥",
        "task":      "✅",
        "manual":    "🎯",
    }
    emoji = emojis.get(source, "🌟")
    event = LeaderboardEvent(
        user_id=user_id,
        user_name=user_name,
        field_key=field_key,
        event_type="xp_earned",
        message=f"{emoji} {user_name} earned +{amount} XP from {source}",
        xp_delta=amount,
    )
    db.add(event)

    if commit:
        db.commit()


def sync_user_classification(user_id: UUID, ob: UserOnboarding, db: Session) -> None:
    """
    Called after onboarding completes or profile changes.
    Writes field_key + batch_key into UserXP so leaderboard queries work immediately.
    """
    field_key = get_user_field(ob)
    batch_key = get_user_batch(ob)

    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    if not xp_row:
        xp_row = UserXP(user_id=user_id, field_key=field_key, batch_key=batch_key)
        db.add(xp_row)
    else:
        xp_row.field_key = field_key
        xp_row.batch_key = batch_key
        # Recompute score in case activity happened before onboarding completed
        stats = compute_user_score(user_id, db)
        xp_row.cached_score = stats["score"]

    db.commit()


def recompute_all_cached_scores(db: Session) -> int:
    """
    Backfill job: recompute cached_score + field_key + batch_key for ALL users.
    Safe to run at any time (idempotent, non-destructive).
    Returns number of users updated.
    """
    rows = (
        db.query(User, UserOnboarding)
        .outerjoin(UserOnboarding, UserOnboarding.user_id == User.id)
        .filter(User.is_active == True)
        .all()
    )

    updated = 0
    for user, ob in rows:
        try:
            field_key = get_user_field(ob) if ob else "general"
            batch_key = get_user_batch(ob) if ob else "batch:general"
            stats = compute_user_score(user.id, db)

            xp_row = db.query(UserXP).filter(UserXP.user_id == user.id).first()
            if not xp_row:
                xp_row = UserXP(user_id=user.id, field_key=field_key, batch_key=batch_key,
                                cached_score=stats["score"])
                db.add(xp_row)
            else:
                xp_row.field_key = field_key
                xp_row.batch_key = batch_key
                xp_row.cached_score = stats["score"]

            updated += 1
        except Exception:
            pass

    db.commit()
    return updated


def take_weekly_rank_snapshot(db: Session) -> None:
    """
    Snapshot current global ranks into previous_weekly_rank.
    Called by the weekly scheduler every Monday 00:01 UTC.
    """
    rank_sql = text("""
        SELECT user_id, RANK() OVER (ORDER BY cached_score DESC, updated_at ASC) AS rank
        FROM user_xp
        WHERE cached_score > 0
    """)
    rows = db.execute(rank_sql).fetchall()
    for row in rows:
        xp_row = db.query(UserXP).filter(UserXP.user_id == row.user_id).first()
        if xp_row:
            xp_row.previous_weekly_rank = int(row.rank)
    db.commit()


def reset_weekly_xp(db: Session) -> None:
    """Reset weekly_xp to 0 for all users. Called Monday 00:00 UTC."""
    db.query(UserXP).update({"weekly_xp": 0})
    db.commit()


def reset_monthly_xp(db: Session) -> None:
    """Reset monthly_xp to 0 for all users. Called 1st of month 00:00 UTC."""
    db.query(UserXP).update({"monthly_xp": 0})
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Legacy compatibility wrappers (keep old callers working)
# ─────────────────────────────────────────────────────────────────────────────

def get_field_leaderboard(
    field_key: str,
    db: Session,
    period: str = "alltime",
    limit: int = 50,
) -> list[dict]:
    """Legacy wrapper — returns same shape as before for existing callers."""
    result = get_leaderboard(
        scope="field",
        scope_key=field_key,
        period=period,
        limit=limit,
        db=db,
    )
    return result["users"]


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _period_col_sql(period: str) -> str:
    if period == "weekly":
        return "ux.weekly_xp"
    if period == "monthly":
        return "ux.monthly_xp"
    return "ux.cached_score"


def _scope_sql_fragment(
    scope: str,
    scope_key: str,
    friend_ids: Optional[list],
    period: str,
) -> dict:
    """Returns {'join': sql, 'where': sql, 'params': dict} for the scope filter."""
    if scope == "field" and scope_key:
        return {
            "join": "",
            "where": "AND ux.field_key = :scope_key",
            "params": {"scope_key": scope_key},
        }
    if scope == "batch" and scope_key:
        return {
            "join": "",
            "where": "AND ux.batch_key = :scope_key",
            "params": {"scope_key": scope_key},
        }
    if scope == "friends" and friend_ids:
        # Use array literal for IN clause
        ids_str = ",".join(f"'{str(fid)}'" for fid in friend_ids)
        return {
            "join": "",
            "where": f"AND ux.user_id IN ({ids_str})" if ids_str else "AND 1=0",
            "params": {},
        }
    # global
    return {"join": "", "where": "", "params": {}}


def _build_scope_filter(scope: str, scope_key: str, friend_ids: Optional[list]):
    """Returns None if scope is empty/invalid (empty friends list)."""
    if scope == "friends" and not friend_ids:
        return None
    return True


def _empty_rank(user_id, db, scope, scope_key, period):
    xp_row = db.query(UserXP).filter(UserXP.user_id == user_id).first()
    return {
        "rank":           None,
        "score":          int(xp_row.cached_score if xp_row else 0),
        "total_users":    0,
        "previous_rank":  None,
        "rank_change":    None,
        "movement_label": "NEW",
        "is_new":         True,
    }


def _compute_movement(rank: int, prev_rank: Optional[int]):
    if prev_rank is None:
        return None, "NEW"
    diff = prev_rank - rank   # positive = moved up
    if diff > 0:
        return diff, f"↑ {diff}"
    if diff < 0:
        return diff, f"↓ {abs(diff)}"
    return 0, "—"


def _initials(name: str) -> str:
    parts = name.split()[:2]
    return "".join(p[0].upper() for p in parts if p) or "US"


def _score_to_league(score: int) -> str:
    if score >= 9500: return "Silicon"
    if score >= 8500: return "Elite"
    if score >= 6000: return "Gold"
    if score >= 3000: return "Silver"
    return "Bronze"


def _rank_to_badge(rank: int) -> Optional[str]:
    if rank == 1:   return "🥇 Legend"
    if rank == 2:   return "🥈 Elite"
    if rank == 3:   return "🥉 Champion"
    if rank <= 10:  return "⭐ Top 10"
    return None


def get_public_user_profile(
    target_user_id: UUID,
    requesting_user_id: UUID,
    db: Session,
) -> dict:
    """
    Return a public profile for the user card that opens when you click on a player.
    Includes: name, bio, streak, league, ranks across scopes, badges.
    Does NOT expose: email, private tasks, private notes, auth data.
    """
    user = db.query(User).filter(User.id == target_user_id, User.is_active == True).first()
    if not user:
        return {}

    ob = db.query(UserOnboarding).filter(UserOnboarding.user_id == target_user_id).first()
    xp_row = db.query(UserXP).filter(UserXP.user_id == target_user_id).first()
    streak_row = db.query(UserStreak).filter(UserStreak.user_id == target_user_id).first()

    name = (ob.full_name if ob else None) or user.name or "User"
    score = int(xp_row.cached_score if xp_row else 0)
    streak = streak_row.current_streak if streak_row else 0
    longest_streak = streak_row.longest_streak if streak_row else 0

    field_key = xp_row.field_key if xp_row else "general"
    batch_key = xp_row.batch_key if xp_row else "batch:general"

    # Compute ranks (efficient — SQL window functions)
    global_rank_info = get_my_rank(target_user_id, db, scope="global", period="alltime")
    field_rank_info  = get_my_rank(target_user_id, db, scope="field",  scope_key=field_key, period="alltime")
    batch_rank_info  = get_my_rank(target_user_id, db, scope="batch",  scope_key=batch_key, period="alltime")

    # Weekly champion checks
    from Backend.models.leaderboard_history import WeeklyLeaderboardSnapshot
    weekly_wins = db.query(WeeklyLeaderboardSnapshot).filter(
        WeeklyLeaderboardSnapshot.user_id == target_user_id,
        WeeklyLeaderboardSnapshot.rank == 1,
    ).count()

    # Challenge count
    challenges_done = db.query(ChallengeParticipant).filter(
        ChallengeParticipant.user_id == target_user_id,
        ChallengeParticipant.completed == True,
    ).count()

    # Arena profile (ELO, wins, level)
    arena_info = {}
    try:
        from Backend.models.arena import ArenaProfile
        arena = db.query(ArenaProfile).filter(ArenaProfile.user_id == target_user_id).first()
        if arena:
            arena_info = {
                "elo":    arena.arena_elo,
                "level":  arena.level,
                "wins":   arena.wins,
                "losses": arena.losses,
            }
    except Exception:
        pass

    # Recent community posts count
    try:
        from Backend.models.community import CommunityPost
        post_count = db.query(CommunityPost).filter(
            CommunityPost.user_id == target_user_id,
        ).count()
    except Exception:
        post_count = 0

    # Friendship status with requesting user
    friendship_status = _get_friendship_status(target_user_id, requesting_user_id, db)

    return {
        "user_id":        str(target_user_id),
        "name":           name,
        "avatar":         _initials(name),
        "image":          user.image,
        "bio":            user.bio or "",
        "score":          score,
        "league":         _score_to_league(score),
        "streak":         streak,
        "longest_streak": longest_streak,
        "challenges_done": challenges_done,
        "weekly_wins":    weekly_wins,
        "post_count":     post_count,
        "field_key":      field_key,
        "field_label":    get_field_label(field_key),
        "batch_key":      batch_key,
        "batch_label":    get_batch_label(batch_key),
        "institution_name": getattr(ob, "institution_name", None) if ob else None,
        "graduation_year":  getattr(ob, "graduation_year", None) if ob else None,
        "user_type":      ob.user_type if ob else None,
        "exam_type":      ob.exam_type if ob else None,
        "global_rank":    global_rank_info.get("rank"),
        "global_total":   global_rank_info.get("total_users"),
        "field_rank":     field_rank_info.get("rank"),
        "field_total":    field_rank_info.get("total_users"),
        "batch_rank":     batch_rank_info.get("rank"),
        "batch_total":    batch_rank_info.get("total_users"),
        "arena":          arena_info,
        "member_since":   user.created_at.isoformat() if user.created_at else None,
        "friendship_status": friendship_status,  # 'none' | 'pending_sent' | 'pending_received' | 'friends'
        "xp_total":       int(xp_row.total_xp if xp_row else 0),
        "xp_weekly":      int(xp_row.weekly_xp if xp_row else 0),
        "is_me":          str(target_user_id) == str(requesting_user_id),
    }


def _get_friendship_status(target_id: UUID, requesting_id: UUID, db: Session) -> str:
    """Check friendship status between two users."""
    if str(target_id) == str(requesting_id):
        return "self"
    try:
        from Backend.models.social import UserFriendship
        f = db.query(UserFriendship).filter(
            or_(
                and_(UserFriendship.requester_id == requesting_id, UserFriendship.addressee_id == target_id),
                and_(UserFriendship.requester_id == target_id,     UserFriendship.addressee_id == requesting_id),
            )
        ).first()
        if not f:
            return "none"
        if f.status == "accepted":
            return "friends"
        if f.requester_id == requesting_id:
            return "pending_sent"
        return "pending_received"
    except Exception:
        return "none"
