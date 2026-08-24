"""add pgvector extension and 384-dim vector column to document_chunks

Revision ID: 004_add_pgvector
Down_revision: 37a32a153c47
Create Date: 2026-08-24
"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "004_add_pgvector"
down_revision = "37a32a153c47"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Enable PostgreSQL pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # 2. Add 384-dimensional vector column to document_chunks table if missing
    op.execute("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS embedding vector(384);")

    # 3. Data Migration: convert existing text JSON embeddings into pgvector vectors
    op.execute(
        "UPDATE document_chunks SET embedding = embedding_json::vector "
        "WHERE embedding_json IS NOT NULL AND embedding IS NULL;"
    )

    # 4. Create HNSW Vector Index for fast cosine similarity search
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw "
        "ON document_chunks USING hnsw (embedding vector_cosine_ops);"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_document_chunks_embedding_hnsw;")
    op.execute("ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;")
