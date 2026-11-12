"""
Backend/nova/router.py

FastAPI router exposing NOVA State, Memory Infrastructure, and LangGraph Engine endpoints.

Security model
--------------
Every endpoint that touches user-specific data (memory, state, chat) requires a valid
JWT bearer token via `get_current_user`. The authenticated user's ID (from the token)
is authoritative — request-body/path `user_id` fields that differ from the token's
subject are rejected with HTTP 403, preventing cross-user data access.

Public endpoints (health, research, knowledge ingest/retrieve) do not carry user-specific
data and remain unauthenticated, matching their original design intent.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from Backend.auth import get_current_user
from Backend.db.session import get_db
from Backend.models.user import User
from Backend.nova.context_builder import build_nova_state
from Backend.nova.types import NovaState
from Backend.nova.memory import (
    MemoryRecord,
    MemoryType,
    MemorySource,
    get_memory_manager,
)
from Backend.nova.graph import run_nova_graph

router = APIRouter()


# ── Helper ─────────────────────────────────────────────────────────────────────

def _require_self(requested_user_id: str, current_user: User) -> None:
    """
    Raises HTTP 403 if `requested_user_id` does not match the authenticated user.

    This prevents any caller from supplying a foreign user_id in the request body
    or URL path to access or modify another user's data.
    """
    if requested_user_id and str(current_user.id) != str(requested_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access denied: authenticated user ({current_user.id}) does not match "
                f"requested user_id ({requested_user_id})."
            ),
        )


# ── Request schemas ─────────────────────────────────────────────────────────────

class BuildStateRequest(BaseModel):
    message: Optional[str] = Field(default=None, description="Latest user prompt message")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    override_profile: Optional[Dict[str, Any]] = Field(default_factory=dict)
    session_id: Optional[str] = Field(default=None)
    # NOTE: user_id is intentionally removed from this model.
    # The authenticated user's ID from the JWT token is always used.


class CreateMemoryRequest(BaseModel):
    content: str = Field(..., description="Memory fact content")
    memory_type: MemoryType = Field(default=MemoryType.SEMANTIC)
    source: MemorySource = Field(default=MemorySource.EXPLICIT_USER)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    # NOTE: user_id removed — always taken from JWT token.


class RetrieveMemoriesRequest(BaseModel):
    query_text: Optional[str] = Field(default=None)
    memory_types: Optional[List[MemoryType]] = Field(default=None)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    limit: int = Field(default=5, ge=1, le=20)


class ChatRequest(BaseModel):
    message: str = Field(..., description="User query prompt")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    override_profile: Optional[Dict[str, Any]] = Field(default_factory=dict)
    # NOTE: user_id removed — always taken from JWT token.


class ResearchApiRequest(BaseModel):
    query_text: str = Field(..., description="Query to search public web for")
    max_results: int = Field(default=5, ge=1, le=10)
    fetch_content: bool = Field(default=True)


class KnowledgeIngestApiRequest(BaseModel):
    title: str = Field(..., description="Document or note title")
    content_text: str = Field(..., description="Document body text")
    source: str = Field(default="user_upload")
    visibility: str = Field(default="private_user")


class KnowledgeRetrieveApiRequest(BaseModel):
    query_text: str = Field(..., description="Search query string")
    top_k: int = Field(default=5)
    trigger_web_fallback: bool = Field(default=True)


# ── Public endpoints (no user data) ────────────────────────────────────────────

@router.get("/health", summary="Check NOVA Engine status")
def nova_health_check():
    return {
        "status": "online",
        "engine": "NOVA",
        "stage": "Step 6 - Knowledge, RAG & Intelligent Web Fallback",
        "langgraph_compiled": True,
    }


@router.post("/research", summary="Execute web research directly")
def nova_research_endpoint(req: ResearchApiRequest):
    """Executes web research and returns normalized sources and content."""
    try:
        from Backend.nova.research import get_research_engine
        engine = get_research_engine()
        payload = engine.research(req.query_text, max_results=req.max_results, fetch_content=req.fetch_content)
        return payload.model_dump()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Web research failed: {str(exc)}",
        )


@router.post("/knowledge/ingest", summary="Ingest document or study notes into Knowledge Base")
def nova_knowledge_ingest_endpoint(
    req: KnowledgeIngestApiRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Ingests a document into the vector store scoped to the authenticated user."""
    try:
        from Backend.nova.knowledge import get_knowledge_manager, DocumentVisibility
        mgr = get_knowledge_manager()
        vis = (
            DocumentVisibility(req.visibility)
            if req.visibility in [v.value for v in DocumentVisibility]
            else DocumentVisibility.PRIVATE_USER
        )
        doc = mgr.ingest_document(
            db=db,
            title=req.title,
            content_text=req.content_text,
            user_id=str(current_user.id),   # always from JWT
            source=req.source,
            visibility=vis,
        )
        return {"status": "success", "document_id": doc.id, "title": doc.title}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(exc)}",
        )


@router.post("/knowledge/retrieve", summary="Retrieve RAG knowledge with intelligent web fallback")
def nova_knowledge_retrieve_endpoint(
    req: KnowledgeRetrieveApiRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes RAG retrieval scoped to the authenticated user."""
    try:
        from Backend.nova.knowledge import get_knowledge_manager
        mgr = get_knowledge_manager()
        k_payload, r_payload = mgr.retrieve_and_evaluate(
            db=db,
            query_text=req.query_text,
            user_id=str(current_user.id),   # always from JWT
            top_k=req.top_k,
            trigger_web_fallback=req.trigger_web_fallback,
        )
        return {
            "knowledge_payload": k_payload.model_dump(),
            "research_payload": r_payload.model_dump() if r_payload else None,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG retrieval failed: {str(exc)}",
        )


# ── Authenticated user-data endpoints ──────────────────────────────────────────

@router.post("/build-state", response_model=NovaState, summary="Assemble complete NOVA state for the current user")
def build_state_endpoint(
    req: BuildStateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assembles and returns NovaState for the authenticated user."""
    try:
        state = build_nova_state(
            user_id=UUID(str(current_user.id)),
            db=db,
            user_message=req.message,
            conversation_history=req.conversation_history,
            override_profile=req.override_profile,
            session_id=req.session_id,
        )
        return state
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assemble NOVA state: {str(exc)}",
        )


@router.post("/chat", summary="Execute a full NOVA turn through LangGraph engine")
def nova_chat_endpoint(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Executes a full NOVA turn for the authenticated user."""
    try:
        result = run_nova_graph(
            user_message=req.message,
            user_id=str(current_user.id),   # always from JWT
            db=db,
            conversation_history=req.conversation_history,
            override_profile=req.override_profile,
        )
        return {
            "response": result["response"],
            "execution_stage": result["execution_stage"],
            "state": result["state"].model_dump(),
        }
    except Exception as exc:
        import traceback
        from Backend.utils.logger import log_custom_error
        log_custom_error("NOVA Chat Engine", str(exc), exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"NOVA turn execution failed: {str(exc)}",
        )


@router.post("/memory", response_model=Optional[MemoryRecord], summary="Store a memory for the current user")
def create_memory_endpoint(
    req: CreateMemoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stores a memory record for the authenticated user."""
    mem_mgr = get_memory_manager()
    record = mem_mgr.remember(
        db,
        user_id=str(current_user.id),   # always from JWT
        content=req.content,
        memory_type=req.memory_type,
        source=req.source,
        confidence=req.confidence,
        importance=req.importance,
        metadata=req.metadata,
    )
    if not record:
        raise HTTPException(status_code=400, detail="Memory rejected by write policy or invalid data")
    return record


@router.get("/memory", response_model=List[MemoryRecord], summary="List memories for the current user")
def list_memories_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lists active memories for the authenticated user."""
    mem_mgr = get_memory_manager()
    return mem_mgr.retrieve(db, user_id=str(current_user.id), limit=50)


@router.delete("/memory/{memory_id}", summary="Archive or delete one of the current user's memories")
def delete_memory_endpoint(
    memory_id: str,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archives or permanently deletes a memory that belongs to the authenticated user."""
    mem_mgr = get_memory_manager()
    success = mem_mgr.forget(
        db,
        user_id=str(current_user.id),   # always from JWT — cannot delete another user's memory
        memory_id=memory_id,
        hard_delete=hard_delete,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found or access denied")
    return {"status": "success", "memory_id": memory_id, "hard_delete": hard_delete}


@router.post("/memory/retrieve", response_model=List[MemoryRecord], summary="Retrieve & rank memories for the current user")
def retrieve_memories_endpoint(
    req: RetrieveMemoriesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieves and ranks relevant memories for the authenticated user."""
    mem_mgr = get_memory_manager()
    return mem_mgr.retrieve(
        db,
        user_id=str(current_user.id),   # always from JWT
        query_text=req.query_text,
        memory_types=req.memory_types,
        min_confidence=req.min_confidence,
        limit=req.limit,
    )
