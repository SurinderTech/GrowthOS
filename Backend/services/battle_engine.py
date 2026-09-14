"""
services/battle_engine.py
GrowthOS Arena - Battle Engine (server-authoritative lifecycle owner).
Architecture: WebSocket handler triggers engine tasks; engine owns timers, AI bot, finalization.
WebSocket is a communication channel only - never owns lifecycle.
"""
from __future__ import annotations
import asyncio, logging, random
from datetime import datetime, timezone
from Backend.db.session import SessionLocal
from Backend.models.arena import (
    Battle, BattlePlayer, BattleTask, BattleSubmission,
    EloHistory, XpTransaction, AIOpponent,
)
from Backend.models.user import User

log = logging.getLogger(__name__)
K_FACTOR = 32

def start_battle_worker(battle_id: str, ws_manager) -> asyncio.Task:
    task = asyncio.create_task(_battle_lifecycle(battle_id, ws_manager), name=f"battle_{battle_id}")
    log.info(f"[Engine] Worker started: {battle_id}")
    return task

def schedule_ai_bot_turn(battle_id: str, task_id: str, bot_cfg: dict, ws_manager) -> asyncio.Task:
    return asyncio.create_task(_ai_bot_answer_task(battle_id, task_id, bot_cfg, ws_manager), name=f"bot_{battle_id}_{task_id}")

async def _battle_lifecycle(battle_id: str, ws_manager):
    db = SessionLocal()
    try:
        battle = db.query(Battle).filter(Battle.id == battle_id).first()
        if not battle:
            return
        for n in [3, 2, 1]:
            await ws_manager.broadcast_battle(battle_id, {"type": "battle:countdown", "seconds_remaining": n})
            await asyncio.sleep(1)
        now = datetime.now(timezone.utc)
        battle.status = "live"
        for p in battle.players:
            p.status = "live"
        db.commit()
        tasks = db.query(BattleTask).filter(BattleTask.battle_id == battle_id).order_by(BattleTask.order).all()
        task_list = [{"id": str(t.id), "type": t.task_type, "order": t.order, "max_score": t.max_score, "config": t.config, "ends_at": t.ends_at.isoformat() if t.ends_at else (battle.ends_at.isoformat() if battle.ends_at else None)} for t in tasks]
        await ws_manager.broadcast_battle(battle_id, {"type": "battle:started", "starts_at": battle.starts_at.isoformat() if battle.starts_at else now.isoformat(), "ends_at": battle.ends_at.isoformat() if battle.ends_at else None, "tasks": task_list})
        log.info(f"[Engine] Battle {battle_id} live with {len(tasks)} tasks")
        if battle.mode == "ai_duel":
            ai_player = next((p for p in battle.players if p.is_ai), None)
            if ai_player and ai_player.ai_opponent_id:
                bot = db.query(AIOpponent).filter(AIOpponent.id == ai_player.ai_opponent_id).first()
                if bot:
                    for t in tasks:
                        schedule_ai_bot_turn(battle_id, str(t.id), {"ai_opponent_id": str(bot.id), "display_name": bot.display_name, "accuracy_max": bot.accuracy_max, "speed_level": bot.speed_level, "task_type": t.task_type, "correct_option": t.config.get("correct", 0)}, ws_manager)
        ends_at = battle.ends_at
        db.close()
        if ends_at:
            wait_secs = max(0.0, (ends_at - datetime.now(timezone.utc)).total_seconds())
            await asyncio.sleep(wait_secs)
        await _finalize_battle_internal(battle_id, ws_manager)
    except asyncio.CancelledError:
        log.info(f"[Engine] Battle {battle_id} worker cancelled")
    except Exception as e:
        log.exception(f"[Engine] Lifecycle error {battle_id}: {e}")
        try:
            await ws_manager.broadcast_battle(battle_id, {"type": "battle:error", "message": "Server error during battle"})
        except Exception:
            pass
    finally:
        try:
            db.close()
        except Exception:
            pass

async def _ai_bot_answer_task(battle_id: str, task_id: str, bot_cfg: dict, ws_manager):
    delay = random.uniform(*{1: (10, 25), 2: (5, 12), 3: (1, 5)}.get(bot_cfg.get("speed_level", 2), (5, 15)))
    await asyncio.sleep(delay)
    db = SessionLocal()
    try:
        battle = db.query(Battle).filter(Battle.id == battle_id).first()
        if not battle or battle.status not in ("live", "lobby"):
            return
        task = db.query(BattleTask).filter(BattleTask.id == task_id).first()
        if not task:
            return
        ai_player = next((p for p in db.query(BattlePlayer).filter(BattlePlayer.battle_id == battle_id, BattlePlayer.is_ai == True).all()), None)
        if not ai_player:
            return
        now = datetime.now(timezone.utc)
        if battle.ends_at and now > battle.ends_at:
            return
        task_type = bot_cfg.get("task_type", "mcq")
        is_correct = random.random() < bot_cfg.get("accuracy_max", 0.8)
        score, selected_option, content = 0, None, None
        if task_type == "mcq":
            correct_opt = bot_cfg.get("correct_option", 0)
            selected_option = correct_opt if is_correct else random.choice([i for i in range(4) if i != correct_opt])
            if is_correct:
                elapsed = (now - battle.starts_at).total_seconds() if battle.starts_at else 0
                total = (battle.ends_at - battle.starts_at).total_seconds() if battle.starts_at and battle.ends_at else 1
                score = task.max_score + int(max(0.0, 1.0 - elapsed / max(1.0, total)) * 50)
        elif task_type == "reasoning":
            content = f"[AI: {bot_cfg.get('display_name', 'Bot')} submitted reasoning.]"
            score = int(task.max_score * 0.75) if is_correct else 0
        sub = BattleSubmission(battle_id=battle_id, task_id=task_id, user_id=None, submission_type=task_type, content=content, selected_option=selected_option, score=score, is_correct=is_correct, evaluation_status="evaluated" if task_type == "mcq" else "pending", evaluation_detail={"source": "bot_simulation", "bot": bot_cfg.get("display_name")})
        db.add(sub)
        ai_player.score = (ai_player.score or 0) + score
        db.commit()
        log.info(f"[Bot] {bot_cfg.get('display_name')} task={task_id} score={score}")
        await ws_manager.broadcast_battle(battle_id, {"type": "battle:score_updated", "user_id": f"ai:{bot_cfg.get('ai_opponent_id')}", "name": bot_cfg.get("display_name", "AI Bot"), "score": ai_player.score, "is_ai": True})
    except Exception as e:
        log.exception(f"[Bot] Error battle={battle_id} task={task_id}: {e}")
    finally:
        db.close()

async def _finalize_battle_internal(battle_id: str, ws_manager):
    db = SessionLocal()
    try:
        battle = db.query(Battle).filter(Battle.id == battle_id).first()
        if not battle or battle.status == "completed":
            return
        now = datetime.now(timezone.utc)
        battle.status = "completed"
        players = db.query(BattlePlayer).filter(BattlePlayer.battle_id == battle_id).order_by(BattlePlayer.score.desc()).all()
        for i, p in enumerate(players):
            p.rank = i + 1
            p.status = "finished"
            if not p.finished_at:
                p.finished_at = now
        db.flush()
        leaderboard = []
        for p in players:
            if not p.is_ai and p.user_id:
                u = db.query(User).filter(User.id == p.user_id).first()
                name = (u.name or u.email.split("@")[0]) if u else "Player"
            else:
                bot = db.query(AIOpponent).filter(AIOpponent.id == p.ai_opponent_id).first() if p.ai_opponent_id else None
                name = bot.display_name if bot else "AI Bot"
            leaderboard.append({"rank": p.rank, "name": name, "score": p.score or 0, "is_ai": p.is_ai, "user_id": str(p.user_id) if p.user_id else f"ai:{p.ai_opponent_id}"})
        human_players = [p for p in players if not p.is_ai and p.user_id]
        if battle.mode == "1v1" and len(human_players) == 2:
            _apply_1v1_elo_and_xp(battle, human_players[0], human_players[1], db)
        elif battle.mode == "ai_duel" and len(human_players) == 1:
            _apply_ai_duel_rating(battle, human_players[0], players, db)
        db.commit()
        log.info(f"[Engine] Battle {battle_id} finalized")
        await ws_manager.broadcast_battle(battle_id, {"type": "battle:completed", "results": {"battle_id": str(battle_id), "leaderboard": leaderboard, "winner": leaderboard[0] if leaderboard else None}})
    except Exception as e:
        log.exception(f"[Engine] Finalize error {battle_id}: {e}")
    finally:
        db.close()

def _elo_expected(pa: int, pb: int) -> float:
    return 1.0 / (1.0 + 10 ** ((pb - pa) / 400))

def _apply_1v1_elo_and_xp(battle, a: BattlePlayer, b: BattlePlayer, db):
    from Backend.services.arena_service import get_or_create_arena_profile, compute_level_from_xp
    pa = get_or_create_arena_profile(a.user_id, db)
    pb = get_or_create_arena_profile(b.user_id, db)
    ra = "win" if (a.score or 0) > (b.score or 0) else "loss" if (b.score or 0) > (a.score or 0) else "draw"
    rb = {"win": "loss", "loss": "win", "draw": "draw"}[ra]
    smap = {"win": 1.0, "draw": 0.5, "loss": 0.0}
    for profile, opp, result in [(pa, pb, ra), (pb, pa, rb)]:
        exp = _elo_expected(profile.arena_elo, opp.arena_elo)
        delta = round(K_FACTOR * (smap[result] - exp))
        old_elo = profile.arena_elo
        profile.arena_elo = max(100, old_elo + delta)
        if result == "win":
            profile.wins += 1; profile.current_streak += 1; profile.best_streak = max(profile.best_streak, profile.current_streak)
        elif result == "loss":
            profile.losses += 1; profile.current_streak = 0
        else:
            profile.draws += 1
        db.add(EloHistory(user_id=profile.user_id, battle_id=battle.id, rating_before=old_elo, rating_after=profile.arena_elo, rating_change=delta, opponent_elo=opp.arena_elo, result=result))
        xp = {"win": 300, "draw": 150, "loss": 75}[result]
        if not db.query(XpTransaction).filter(XpTransaction.user_id == profile.user_id, XpTransaction.battle_id == battle.id).first():
            db.add(XpTransaction(user_id=profile.user_id, battle_id=battle.id, amount=xp, source="battle", note=f"1v1 {result}"))
            profile.arena_xp += xp
            lvl, _ = compute_level_from_xp(profile.arena_xp)
            profile.level = lvl

def _apply_ai_duel_rating(battle, human: BattlePlayer, all_players, db):
    from Backend.services.arena_service import get_or_create_arena_profile, compute_level_from_xp
    ai_player = next((p for p in all_players if p.is_ai), None)
    if not ai_player or not ai_player.ai_opponent_id:
        return
    bot = db.query(AIOpponent).filter(AIOpponent.id == ai_player.ai_opponent_id).first()
    if not bot:
        return
    profile = get_or_create_arena_profile(human.user_id, db)
    result = "win" if (human.score or 0) > (ai_player.score or 0) else "loss" if (ai_player.score or 0) > (human.score or 0) else "draw"
    if result == "win": profile.ai_duel_wins += 1
    elif result == "loss": profile.ai_duel_losses += 1
    exp = _elo_expected(profile.ai_duel_rating, bot.elo)
    delta = round(K_FACTOR * ({"win": 1.0, "draw": 0.5, "loss": 0.0}[result] - exp))
    profile.ai_duel_rating = max(100, profile.ai_duel_rating + delta)
    xp = {"win": 150, "draw": 75, "loss": 30}[result]
    if not db.query(XpTransaction).filter(XpTransaction.user_id == profile.user_id, XpTransaction.battle_id == battle.id).first():
        db.add(XpTransaction(user_id=profile.user_id, battle_id=battle.id, amount=xp, source="ai_duel", note=f"AI Duel vs {bot.display_name} {result}"))
        profile.arena_xp += xp
        lvl, _ = compute_level_from_xp(profile.arena_xp)
        profile.level = lvl
    log.info(f"[Engine] AI Duel: {result} | ai_duel_rating delta={delta} | XP={xp}")
