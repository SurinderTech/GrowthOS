# scratch/test_arena_battle_flow.py
import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

# Import all models to configure SQLAlchemy relationships
from Backend.db.init_db import init_db

from Backend.db.session import SessionLocal
from Backend.models.user import User
from Backend.models.arena import AIOpponent
from Backend.services.arena_service import create_ai_duel, get_battle_state

db = SessionLocal()
try:
    user = db.query(User).first()
    bot = db.query(AIOpponent).first()

    if not user or not bot:
        print("User or bot missing in DB")
        sys.exit(0)

    print(f"Creating AI duel for user {user.email} vs bot {bot.display_name}...")
    duel = create_ai_duel(user.id, bot.id, db)
    battle_id = duel["battle_id"]
    print("Duel created:", battle_id)

    print("Fetching battle state...")
    state = get_battle_state(battle_id, user.id, db)
    print("Battle status:", state["status"])
    print("Tasks count:", len(state["tasks"]))
    print("Players count:", len(state["players"]))

    if state["status"] == "live" and len(state["tasks"]) > 0:
        print("\n✅ ARENA BATTLE AUTO-TRANSITION & TASK LOADING PASSED PERFECTLY!")
    else:
        print("\n❌ Battle state check failed")

finally:
    db.close()
