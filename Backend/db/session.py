from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from sqlalchemy.orm import declarative_base

from pathlib import Path

Base = declarative_base()

# Load env variables from Backend/.env, root .env, or cwd
env_backend = Path(__file__).resolve().parent.parent / ".env"
env_root = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_backend)
load_dotenv(env_root)
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print("DATABASE_URL =", DATABASE_URL)

engine = create_engine(
    DATABASE_URL,
    pool_size=5,          # 🔥 VERY IMPORTANT
    max_overflow=10,       # 🔥 VERY IMPORTANT
    pool_pre_ping=True,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 30
    }
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()