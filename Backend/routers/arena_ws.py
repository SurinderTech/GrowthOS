"""
routers/arena_ws.py

GrowthOS Arena — WebSocket real-time engine.

Endpoints:
  WS /ws/battles/{battle_id}
  WS /ws/boss-runs/{run_id}

Architecture (Phase 1 — single process):
  ConnectionManager holds per-battle and per-run connection pools.
  Events broadcast to all participants in real time.

Phase 2: Replace with Redis Pub/Sub for multi-process / multi-server support.

Event types sent by server:
  battle:started         { starts_at, ends_at, config }
  battle:player_joined   { user_id, name }
  battle:player_left     { user_id }
  battle:ready           { ready_count, total_count }
  battle:countdown       { seconds_remaining }
  battle:score_updated   { user_id, score, rank }
  battle:leaderboard     [ { rank, name, score } ]
  battle:completed       { results }
  battle:error           { message }

  boss:hp_updated        { current_hp, total_hp, hp_percent }
  boss:attack            { attack_type, description, phase }
  boss:phase_changed     { phase }
  boss:defeated          { }
  boss:failed            { }
  boss:error             { message }
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from Backend.db.session import get_db
from Backend.models.arena import Battle, BattlePlayer, BattleTask, BossRun, BossInstance

log = logging.getLogger(__name__)

router = APIRouter(tags=["Arena WebSocket"])


# ─────────────────────────────────────────────────────────────────────────────
# Connection Manager
# ─────────────────────────────────────────────────────────────────────────────

class ArenaConnectionManager:
    def __init__(self):
        # battle_id → list of (WebSocket, user_id)
        self.battle_connections: Dict[str, List[tuple]] = {}
        # boss_run_id → list of (WebSocket, user_id)
        self.boss_connections: Dict[str, List[tuple]] = {}

    # ── Battle connections ──────────────────────────────────────────────────

    async def connect_battle(self, ws: WebSocket, battle_id: str, user_id: str):
        await ws.accept()
        if battle_id not in self.battle_connections:
            self.battle_connections[battle_id] = []
        self.battle_connections[battle_id].append((ws, user_id))
        log.info(f"[WS] User {user_id} connected to battle {battle_id}")

    def disconnect_battle(self, ws: WebSocket, battle_id: str):
        if battle_id in self.battle_connections:
            self.battle_connections[battle_id] = [
                (w, u) for w, u in self.battle_connections[battle_id] if w != ws
            ]

    async def broadcast_battle(self, battle_id: str, msg):
        """
        Broadcast to all connections in a battle.
        msg can be a pre-built dict (used by battle_engine) or separate (event, data) - both are supported.
        """
        if battle_id not in self.battle_connections:
            return
        if isinstance(msg, dict):
            payload = json.dumps(msg)
        else:
            # Legacy path: msg is actually 'event', accept a third positional arg
            payload = json.dumps({"type": msg})
        dead = []
        for ws, uid in self.battle_connections[battle_id]:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_battle(ws, battle_id)

    async def send_to_user_in_battle(self, battle_id: str, user_id: str, event: str, data: dict):
        if battle_id not in self.battle_connections:
            return
        for ws, uid in self.battle_connections[battle_id]:
            if uid == user_id:
                try:
                    await ws.send_text(json.dumps({"event": event, "data": data}))
                except Exception:
                    pass

    # ── Boss connections ────────────────────────────────────────────────────

    async def connect_boss(self, ws: WebSocket, run_id: str, user_id: str):
        await ws.accept()
        if run_id not in self.boss_connections:
            self.boss_connections[run_id] = []
        self.boss_connections[run_id].append((ws, user_id))
        log.info(f"[WS] User {user_id} connected to boss-run {run_id}")

    def disconnect_boss(self, ws: WebSocket, run_id: str):
        if run_id in self.boss_connections:
            self.boss_connections[run_id] = [
                (w, u) for w, u in self.boss_connections[run_id] if w != ws
            ]

    async def broadcast_boss(self, run_id: str, event: str, data: dict):
        if run_id not in self.boss_connections:
            return
        dead = []
        for ws, uid in self.boss_connections[run_id]:
            try:
                await ws.send_text(json.dumps({"event": event, "data": data}))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_boss(ws, run_id)


manager = ArenaConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# Battle WebSocket
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/battles/{battle_id}")
async def battle_ws(
    websocket: WebSocket,
    battle_id: str,
    token: str = Query(...),
):
    """
    Connect to a live battle.
    Client must send token as query param: ws://.../ws/battles/{id}?token=JWT

    On connect:
      1. Verify JWT
      2. Verify user is a battle participant
      3. Send authoritative battle state
      4. Accept live events from client (answer_submitted, etc.)
      5. Broadcast score/leaderboard updates to all participants
    """
    from Backend.auth import decode_token as decode_access_token
    from Backend.db.session import SessionLocal

    # Auth
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001)
        return

    # Verify participant
    db: Session = SessionLocal()
    try:
        battle = db.query(Battle).filter(Battle.id == UUID(battle_id)).first()
        if not battle:
            await websocket.close(code=4004)
            return

        participant = db.query(BattlePlayer).filter(
            BattlePlayer.battle_id == UUID(battle_id),
            BattlePlayer.user_id == UUID(user_id),
        ).first()
        if not participant:
            await websocket.close(code=4003)
            return
    finally:
        db.close()

    await manager.connect_battle(websocket, battle_id, user_id)

    try:
        # Send initial authoritative state on connect
        db = SessionLocal()
        try:
            battle = db.query(Battle).filter(Battle.id == UUID(battle_id)).first()
            players = db.query(BattlePlayer).filter(BattlePlayer.battle_id == UUID(battle_id)).all()

            await websocket.send_text(json.dumps({
                "event": "battle:state",
                "data": {
                    "battle_id":   battle_id,
                    "status":      battle.status,
                    "mode":        battle.mode,
                    "format":      battle.challenge_format,
                    "starts_at":   battle.starts_at.isoformat() if battle.starts_at else None,
                    "ends_at":     battle.ends_at.isoformat() if battle.ends_at else None,
                    "config":      battle.config or {},
                    "leaderboard": [
                        {"user_id": str(p.user_id), "score": p.score, "status": p.status}
                        for p in sorted(players, key=lambda x: x.score, reverse=True)
                    ],
                },
            }))
        finally:
            db.close()

        # Notify others that this user joined/reconnected
        await manager.broadcast_battle(battle_id, {
            "type": "battle:player_joined",
            "user_id": user_id,
        })

        # If battle is already live on reconnect, send current state snapshot
        db = SessionLocal()
        try:
            battle = db.query(Battle).filter(Battle.id == UUID(battle_id)).first()
            if battle and battle.status == "live":
                tasks = db.query(BattleTask).filter(BattleTask.battle_id == UUID(battle_id)).order_by(BattleTask.order).all()
                players = db.query(BattlePlayer).filter(BattlePlayer.battle_id == UUID(battle_id)).order_by(BattlePlayer.score.desc()).all()
                await websocket.send_text(json.dumps({
                    "type": "battle:state",
                    "status": battle.status,
                    "ends_at": battle.ends_at.isoformat() if battle.ends_at else None,
                    "tasks": [{"id": str(t.id), "type": t.task_type, "order": t.order, "config": t.config} for t in tasks],
                    "leaderboard": [{"user_id": str(p.user_id) if p.user_id else f"ai:{p.ai_opponent_id}", "score": p.score or 0, "rank": i+1} for i, p in enumerate(players)],
                }))
        finally:
            db.close()

        # Listen for client messages
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event = msg.get("event", msg.get("type", ""))

            # Client signals ready — when all human players are ready, start engine
            if event == "player:ready":
                db = SessionLocal()
                try:
                    player = db.query(BattlePlayer).filter(
                        BattlePlayer.battle_id == UUID(battle_id),
                        BattlePlayer.user_id == UUID(user_id),
                    ).first()
                    if player:
                        player.status = "ready"
                        db.commit()

                    # Check if all human players are ready
                    all_players = db.query(BattlePlayer).filter(BattlePlayer.battle_id == UUID(battle_id)).all()
                    human_players = [p for p in all_players if not p.is_ai]
                    all_ready = all(p.status == "ready" for p in human_players) and len(human_players) > 0

                    if all_ready:
                        battle = db.query(Battle).filter(Battle.id == UUID(battle_id)).first()
                        if battle and battle.status in ("waiting", "lobby"):
                            battle.status = "lobby"  # acknowledge all ready
                            db.commit()
                            # ——— Engine owns the lifecycle. WS only triggers it. ———
                            from Backend.services.battle_engine import start_battle_worker
                            start_battle_worker(battle_id, manager)
                finally:
                    db.close()

            # Client submits answer — record and broadcast score update
            elif event == "answer:submit":
                db = SessionLocal()
                try:
                    from Backend.services.arena_service import submit_battle_answer
                    result = submit_battle_answer(
                        battle_id=UUID(battle_id),
                        user_id=UUID(user_id),
                        task_id=msg.get("task_id"),
                        submission_type=msg.get("submission_type", "mcq"),
                        content=msg.get("content", ""),
                        selected_option=msg.get("selected_option"),
                        language=msg.get("language"),
                        db=db,
                    )

                    # Broadcast updated leaderboard
                    players = (
                        db.query(BattlePlayer)
                        .filter(BattlePlayer.battle_id == UUID(battle_id))
                        .order_by(BattlePlayer.score.desc())
                        .all()
                    )
                    lb = [
                        {"rank": i + 1, "user_id": str(p.user_id) if p.user_id else f"ai:{p.ai_opponent_id}", "score": p.score or 0, "is_ai": p.is_ai}
                        for i, p in enumerate(players)
                    ]
                    await manager.broadcast_battle(battle_id, {
                        "type": "battle:score_updated",
                        "user_id": user_id,
                        "score": result.get("score", 0),
                        "leaderboard": lb,
                    })

                    # Private confirmation to submitter
                    await websocket.send_text(json.dumps({
                        "type": "answer:confirmed",
                        "result": result,
                    }))
                    # NOTE: No inline finalization here. Engine timer owns that.

                except ValueError as e:
                    await websocket.send_text(json.dumps({
                        "type": "battle:error",
                        "message": str(e),
                    }))
                finally:
                    db.close()

            # Client requests current state (e.g., after reconnect)
            elif event == "state:request":
                db = SessionLocal()
                try:
                    battle = db.query(Battle).filter(Battle.id == UUID(battle_id)).first()
                    players = db.query(BattlePlayer).filter(
                        BattlePlayer.battle_id == UUID(battle_id)
                    ).order_by(BattlePlayer.score.desc()).all()
                    tasks = db.query(BattleTask).filter(BattleTask.battle_id == UUID(battle_id)).order_by(BattleTask.order).all()

                    await websocket.send_text(json.dumps({
                        "type": "battle:state",
                        "status": battle.status if battle else "unknown",
                        "ends_at": battle.ends_at.isoformat() if battle and battle.ends_at else None,
                        "tasks": [{"id": str(t.id), "type": t.task_type, "order": t.order, "config": t.config} for t in tasks],
                        "leaderboard": [
                            {"user_id": str(p.user_id) if p.user_id else f"ai:{p.ai_opponent_id}", "score": p.score or 0, "rank": i + 1, "is_ai": p.is_ai}
                            for i, p in enumerate(players)
                        ],
                    }))
                finally:
                    db.close()

    except WebSocketDisconnect:
        manager.disconnect_battle(websocket, battle_id)
        await manager.broadcast_battle(battle_id, {"type": "battle:player_left", "user_id": user_id})
        log.info(f"[WS] User {user_id} disconnected from battle {battle_id}")


# ─────────────────────────────────────────────────────────────────────────────
# Boss Run WebSocket
# ─────────────────────────────────────────────────────────────────────────────

@router.websocket("/boss-runs/{run_id}")
async def boss_run_ws(
    websocket: WebSocket,
    run_id: str,
    token: str = Query(...),
):
    """
    Connect to a live boss run.
    Events: boss:hp_updated, boss:attack, boss:phase_changed, boss:defeated, boss:failed
    """
    from Backend.auth import decode_access_token
    from Backend.db.session import SessionLocal

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub")
    if not user_id:
        await websocket.close(code=4001)
        return

    db = SessionLocal()
    try:
        run = db.query(BossRun).filter(
            BossRun.id == UUID(run_id),
            BossRun.user_id == UUID(user_id),
        ).first()
        if not run:
            await websocket.close(code=4003)
            return
    finally:
        db.close()

    await manager.connect_boss(websocket, run_id, user_id)

    try:
        # Send initial boss state
        db = SessionLocal()
        try:
            run = db.query(BossRun).filter(BossRun.id == UUID(run_id)).first()
            inst = run.boss_instance
            await websocket.send_text(json.dumps({
                "event": "boss:state",
                "data": {
                    "run_id":       run_id,
                    "boss_name":    inst.boss.name,
                    "boss_emoji":   inst.boss.emoji,
                    "current_hp":   inst.current_hp,
                    "total_hp":     inst.total_hp,
                    "hp_percent":   int((inst.current_hp / inst.total_hp) * 100) if inst.total_hp else 0,
                    "current_phase": run.current_phase,
                    "ends_at":      inst.ends_at.isoformat(),
                    "phases":       inst.boss.phases,
                },
            }))
        finally:
            db.close()

        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            event = msg.get("event", "")

            if event == "boss:submit":
                db = SessionLocal()
                try:
                    from Backend.services.arena_service import submit_boss_answer
                    result = submit_boss_answer(
                        run_id=UUID(run_id),
                        user_id=UUID(user_id),
                        phase=msg.get("phase", 1),
                        submission_type=msg.get("submission_type", "reasoning"),
                        content=msg.get("content", ""),
                        db=db,
                    )

                    # Send HP update
                    await websocket.send_text(json.dumps({
                        "event": "boss:hp_updated",
                        "data": {
                            "current_hp":  result["boss_hp"],
                            "total_hp":    db.query(BossRun).filter(BossRun.id == UUID(run_id)).first().boss_instance.total_hp,
                            "hp_percent":  result["boss_hp_percent"],
                            "damage":      result["damage_dealt"],
                        },
                    }))

                    if result["boss_defeated"]:
                        await websocket.send_text(json.dumps({
                            "event": "boss:defeated",
                            "data": {"total_damage": result["total_damage"]},
                        }))

                    elif result["current_phase"] > msg.get("phase", 1):
                        # Phase changed
                        run = db.query(BossRun).filter(BossRun.id == UUID(run_id)).first()
                        inst = run.boss_instance
                        phases = inst.boss.phases or []
                        new_phase = result["current_phase"]
                        phase_data = phases[new_phase - 1] if new_phase <= len(phases) else {}
                        await websocket.send_text(json.dumps({
                            "event": "boss:phase_changed",
                            "data": {
                                "phase": new_phase,
                                "title": phase_data.get("title", f"Phase {new_phase}"),
                                "description": phase_data.get("description", ""),
                                "attack_type": phase_data.get("attack_type", ""),
                            },
                        }))

                except ValueError as e:
                    await websocket.send_text(json.dumps({
                        "event": "boss:error",
                        "data": {"message": str(e)},
                    }))
                finally:
                    db.close()

            elif event == "state:request":
                db = SessionLocal()
                try:
                    run = db.query(BossRun).filter(BossRun.id == UUID(run_id)).first()
                    inst = run.boss_instance
                    await websocket.send_text(json.dumps({
                        "event": "boss:state",
                        "data": {
                            "current_hp":   inst.current_hp,
                            "total_hp":     inst.total_hp,
                            "hp_percent":   int((inst.current_hp / inst.total_hp) * 100),
                            "current_phase": run.current_phase,
                            "ends_at":      inst.ends_at.isoformat(),
                        },
                    }))
                finally:
                    db.close()

    except WebSocketDisconnect:
        manager.disconnect_boss(websocket, run_id)
        log.info(f"[WS] User {user_id} disconnected from boss run {run_id}")


# ─────────────────────────────────────────────────────────────────────────────
# Global broadcast helpers (called from arena_service when battles end)
# ─────────────────────────────────────────────────────────────────────────────

async def broadcast_score_update(battle_id: str, leaderboard: list):
    await manager.broadcast_battle(battle_id, "battle:leaderboard_updated", {
        "leaderboard": leaderboard
    })


async def broadcast_boss_hp(run_id: str, hp_data: dict):
    await manager.broadcast_boss(run_id, "boss:hp_updated", hp_data)
