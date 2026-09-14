"""
routers/arena.py

GrowthOS Arena — REST API
All state is server-authoritative. Client sends actions; backend decides outcomes.

Routes:
  GET  /arena/profile
  GET  /arena/stats
  GET  /arena/live
  GET  /arena/upcoming
  GET  /arena/recommended
  GET  /arena/opponents
  GET  /arena/season
  GET  /arena/boss

  POST /arena/matchmaking/join
  POST /arena/matchmaking/leave
  GET  /arena/matchmaking/status

  GET  /arena/battles/{id}
  POST /arena/battles/{id}/ready
  POST /arena/battles/{id}/submit
  GET  /arena/battles/{id}/results
  GET  /arena/battles/{id}/leaderboard

  GET  /arena/bosses
  GET  /arena/bosses/{id}
  POST /arena/bosses/{id}/start
  GET  /arena/boss-runs/{id}
  POST /arena/boss-runs/{id}/submit

  GET  /arena/opponents
  POST /arena/duels/create

  GET  /arena/leaderboards/global
  GET  /arena/leaderboards/weekly
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from Backend.auth import get_current_user
from Backend.db.session import get_db
from Backend.models.user import User
from Backend.services.arena_service import (
    get_arena_profile_data,
    get_live_battles,
    get_upcoming_events,
    get_platform_stats,
    get_ai_opponents,
    get_active_season,
    get_active_boss,
    join_matchmaking,
    leave_matchmaking,
    get_matchmaking_status,
    get_battle_state,
    submit_battle_answer,
    get_battle_results,
    get_battle_leaderboard,
    start_boss_run,
    submit_boss_answer,
    create_ai_duel,
    get_recommended_challenge,
    get_or_create_arena_profile,
)
from Backend.models.arena import (
    Battle, BattlePlayer, Boss, BossInstance, BossRun,
    AIOpponent, ArenaSeason, ArenaProfile
)
from Backend.models.leaderboard import UserXP
from Backend.models.user import User as UserModel

router = APIRouter(tags=["Arena"])


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ─────────────────────────────────────────────────────────────────────────────

class MatchmakingJoinRequest(BaseModel):
    mode: str = "1v1"
    challenge_format: Optional[str] = "mcq"


class SubmitAnswerRequest(BaseModel):
    submission_type: str       # mcq | reasoning | code
    content: Optional[str] = None
    selected_option: Optional[int] = None
    language: Optional[str] = None


class BossSubmitRequest(BaseModel):
    phase: int = 1
    submission_type: str = "reasoning"
    content: str


class CreateDuelRequest(BaseModel):
    opponent_id: str


# ─────────────────────────────────────────────────────────────────────────────
# Profile & Stats
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile")
def arena_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns real arena profile data: ELO, level, XP%, wins, streak, skills.
    Upserts a profile row on first access.
    """
    return get_arena_profile_data(current_user.id, db)


@router.get("/stats")
def arena_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Skill stats for radar chart — derived from real battle history."""
    profile = get_or_create_arena_profile(current_user.id, db)
    total_games = profile.wins + profile.losses + profile.draws
    win_rate = round((profile.wins / total_games * 100) if total_games else 0)

    return {
        "skills": {
            "problem_solving": profile.skill_problem_solving,
            "coding":          profile.skill_coding,
            "debugging":       profile.skill_debugging,
            "system_design":   profile.skill_system_design,
            "ai_engineering":  profile.skill_ai_engineering,
            "speed":           profile.skill_speed,
            "accuracy":        profile.skill_accuracy,
            "collaboration":   profile.skill_collaboration,
        },
        "win_rate":    win_rate,
        "total_games": total_games,
        "current_streak": profile.current_streak,
        "best_streak":    profile.best_streak,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Discovery
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/live")
def live_battles(
    limit: int = Query(8, le=20),
    db: Session = Depends(get_db),
):
    """Real live battles from the battles table. Timers are server-authoritative."""
    battles = get_live_battles(db, limit=limit)
    stats   = get_platform_stats(db)
    return {
        "battles":         battles,
        "players_online":  stats["players_online"],
        "live_count":      stats["live_battles"],
    }


@router.get("/upcoming")
def upcoming_events(
    limit: int = Query(8, le=20),
    db: Session = Depends(get_db),
):
    return {"events": get_upcoming_events(db, limit=limit)}


@router.get("/recommended")
def recommended_challenge(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = get_recommended_challenge(current_user.id, db)
    if not rec:
        raise HTTPException(status_code=404, detail="No recommendation available yet")
    return rec


@router.get("/season")
def current_season(db: Session = Depends(get_db)):
    season = get_active_season(db)
    if not season:
        raise HTTPException(status_code=404, detail="No active season")
    return season


@router.get("/boss")
def active_boss(db: Session = Depends(get_db)):
    boss = get_active_boss(db)
    if not boss:
        raise HTTPException(status_code=404, detail="No active boss")
    return boss


@router.get("/opponents")
def list_opponents(db: Session = Depends(get_db)):
    return {"opponents": get_ai_opponents(db)}



# ─────────────────────────────────────────────────────────────────────────────
# Matchmaking
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/matchmaking/join")
def matchmaking_join(
    req: MatchmakingJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = join_matchmaking(
        user_id=current_user.id,
        mode=req.mode,
        challenge_format=req.challenge_format or "mcq",
        db=db,
    )
    return result


@router.post("/matchmaking/leave")
def matchmaking_leave(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    leave_matchmaking(current_user.id, db)
    return {"status": "left_queue"}


@router.get("/matchmaking/status")
def matchmaking_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_matchmaking_status(current_user.id, db)


# ─────────────────────────────────────────────────────────────────────────────
# Battles
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/battles/{battle_id}")
def get_battle(
    battle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return get_battle_state(battle_id, current_user.id, db)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/battles/me")
def get_my_active_battle(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the user's currently active battle (non-completed).
    Used by the frontend to resume an in-progress battle.
    """
    player = (
        db.query(BattlePlayer)
        .join(Battle)
        .filter(
            BattlePlayer.user_id == current_user.id,
            Battle.status.in_(["waiting", "lobby", "live"]),
        )
        .order_by(Battle.created_at.desc())
        .first()
    )
    if not player:
        raise HTTPException(status_code=404, detail="No active battle")

    battle = db.query(Battle).filter(Battle.id == player.battle_id).first()
    return {
        "battle_id": str(battle.id),
        "status":    battle.status,
        "mode":      battle.mode,
        "title":     battle.title,
        "ends_at":   battle.ends_at.isoformat() if battle.ends_at else None,
    }



@router.post("/battles/{battle_id}/ready")
def battle_ready(
    battle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from Backend.models.arena import BattlePlayer
    player = db.query(BattlePlayer).filter(
        BattlePlayer.battle_id == battle_id,
        BattlePlayer.user_id == current_user.id,
    ).first()
    if not player:
        raise HTTPException(status_code=403, detail="Not a participant")

    from datetime import datetime, timezone
    player.status = "ready"
    player.ready_at = datetime.now(timezone.utc)
    db.commit()

    # Check if all human players are ready
    battle = db.query(Battle).filter(Battle.id == battle_id).first()
    all_players = db.query(BattlePlayer).filter(BattlePlayer.battle_id == battle_id).all()
    human_players = [p for p in all_players if not p.is_ai]
    all_ready = all(p.status == "ready" for p in human_players) and len(human_players) > 0

    if all_ready and battle and battle.status in ("waiting", "lobby"):
        # Engine owns the lifecycle — we just trigger it here.
        # The WS handler also triggers it for WS-based flows.
        from Backend.routers.arena_ws import manager as ws_manager
        from Backend.services.battle_engine import start_battle_worker
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            loop.create_task(start_battle_worker(str(battle_id), ws_manager))
        except RuntimeError:
            # No running event loop (e.g. in sync test context) — skip
            pass
        return {"status": "battle_starting", "ends_at": battle.ends_at.isoformat() if battle.ends_at else None}

    return {"status": "ready", "waiting_for": len([p for p in human_players if p.status != "ready"])}


@router.post("/battles/{battle_id}/submit")
def battle_submit(
    battle_id: UUID,
    req: SubmitAnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        result = submit_battle_answer(
            battle_id=battle_id,
            user_id=current_user.id,
            submission_type=req.submission_type,
            content=req.content or "",
            selected_option=req.selected_option,
            language=req.language,
            db=db,
        )
        return result
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/battles/{battle_id}/results")
def battle_results(
    battle_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return get_battle_results(battle_id, current_user.id, db)
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/battles/{battle_id}/leaderboard")
def battle_leaderboard(
    battle_id: UUID,
    db: Session = Depends(get_db),
):
    return {"leaderboard": get_battle_leaderboard(battle_id, db)}


# ─────────────────────────────────────────────────────────────────────────────
# Boss Raids
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/bosses")
def list_bosses(db: Session = Depends(get_db)):
    bosses = db.query(Boss).filter(Boss.is_active == True).all()
    return {
        "bosses": [
            {
                "id":          str(b.id),
                "name":        b.name,
                "emoji":       b.emoji,
                "description": b.description,
                "difficulty":  b.difficulty,
                "phases":      len(b.phases or []),
            }
            for b in bosses
        ]
    }


@router.get("/bosses/{boss_id}")
def get_boss(boss_id: UUID, db: Session = Depends(get_db)):
    boss = db.query(Boss).filter(Boss.id == boss_id).first()
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")

    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    inst = db.query(BossInstance).filter(
        BossInstance.boss_id == boss_id,
        BossInstance.status == "active",
        BossInstance.ends_at > now,
    ).first()

    hp_pct = int((inst.current_hp / inst.total_hp) * 100) if inst else 100

    return {
        "id":          str(boss.id),
        "name":        boss.name,
        "emoji":       boss.emoji,
        "description": boss.description,
        "difficulty":  boss.difficulty,
        "phases":      boss.phases,
        "instance": {
            "id":         str(inst.id) if inst else None,
            "current_hp": inst.current_hp if inst else boss.total_hp,
            "total_hp":   inst.total_hp if inst else boss.total_hp,
            "hp_percent": hp_pct,
            "ends_at":    inst.ends_at.isoformat() if inst else None,
        } if inst else None,
    }


@router.post("/bosses/{boss_instance_id}/start")
def start_boss(
    boss_instance_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return start_boss_run(boss_instance_id, current_user.id, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/boss-runs/{run_id}")
def get_boss_run(
    run_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    run = db.query(BossRun).filter(
        BossRun.id == run_id, BossRun.user_id == current_user.id
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    inst = run.boss_instance
    return {
        "run_id":         str(run.id),
        "status":         run.status,
        "damage_dealt":   run.damage_dealt,
        "score":          run.score,
        "current_phase":  run.current_phase,
        "boss_hp":        inst.current_hp,
        "boss_total_hp":  inst.total_hp,
        "hp_percent":     int((inst.current_hp / inst.total_hp) * 100) if inst.total_hp else 0,
        "ends_at":        inst.ends_at.isoformat(),
        "phases":         inst.boss.phases,
    }


@router.post("/boss-runs/{run_id}/submit")
def submit_boss(
    run_id: UUID,
    req: BossSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return submit_boss_answer(
            run_id=run_id,
            user_id=current_user.id,
            phase=req.phase,
            submission_type=req.submission_type,
            content=req.content,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# AI Duel
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/duels/create")
def create_duel(
    req: CreateDuelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        from uuid import UUID as _UUID
        return create_ai_duel(current_user.id, _UUID(req.opponent_id), db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Leaderboards
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/leaderboards/global")
def global_leaderboard(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    profiles = (
        db.query(ArenaProfile)
        .order_by(ArenaProfile.arena_elo.desc())
        .limit(limit)
        .all()
    )
    result = []
    for i, p in enumerate(profiles):
        u = db.query(UserModel).filter(UserModel.id == p.user_id).first()
        result.append({
            "rank":      i + 1,
            "name":      u.name if u else "Player",
            "elo":       p.arena_elo,
            "level":     p.level,
            "wins":      p.wins,
            "streak":    p.current_streak,
        })
    return {"leaderboard": result}


@router.get("/leaderboards/weekly")
def weekly_leaderboard(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import func as sqlfunc
    week_start = datetime.now(timezone.utc) - timedelta(days=7)

    from Backend.models.arena import XpTransaction
    rows = (
        db.query(
            XpTransaction.user_id,
            sqlfunc.sum(XpTransaction.amount).label("weekly_xp"),
        )
        .filter(XpTransaction.created_at >= week_start)
        .group_by(XpTransaction.user_id)
        .order_by(sqlfunc.sum(XpTransaction.amount).desc())
        .limit(limit)
        .all()
    )
    result = []
    for i, row in enumerate(rows):
        u = db.query(UserModel).filter(UserModel.id == row.user_id).first()
        result.append({
            "rank":       i + 1,
            "name":       u.name if u else "Player",
            "weekly_xp":  row.weekly_xp,
        })
    return {"leaderboard": result}


@router.get("/leaderboards/{battle_id}")
def battle_specific_leaderboard(
    battle_id: UUID,
    db: Session = Depends(get_db),
):
    return {"leaderboard": get_battle_leaderboard(battle_id, db)}
