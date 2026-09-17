"""
Backend/nova/router.py

FastAPI router exposing NOVA State, Memory Infrastructure, and LangGraph Engine endpoints.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from Backend.db.session import get_db
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


class BuildStateRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="Target user UUID string")
    message: Optional[str] = Field(default=None, description="Latest user prompt message")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Recent conversation messages")
    override_profile: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Mock/override profile dict for non-DB callers")
    session_id: Optional[str] = Field(default=None, description="Conversation session ID")


class CreateMemoryRequest(BaseModel):
    user_id: str = Field(..., description="Target user UUID string")
    content: str = Field(..., description="Memory fact content")
    memory_type: MemoryType = Field(default=MemoryType.SEMANTIC)
    source: MemorySource = Field(default=MemorySource.EXPLICIT_USER)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    importance: float = Field(default=0.5, ge=0.0, le=1.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RetrieveMemoriesRequest(BaseModel):
    user_id: str = Field(..., description="Target user UUID string")
    query_text: Optional[str] = Field(default=None, description="Optional query text for relevance ranking")
    memory_types: Optional[List[MemoryType]] = Field(default=None)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    limit: int = Field(default=5, ge=1, le=20)


class ChatRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, description="Target user UUID string")
    message: str = Field(..., description="User query prompt")
    conversation_history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    override_profile: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ResearchApiRequest(BaseModel):
    query_text: str = Field(..., description="Query to search public web for")
    max_results: int = Field(default=5, ge=1, le=10)
    fetch_content: bool = Field(default=True)


class KnowledgeIngestApiRequest(BaseModel):
    user_id: Optional[str] = Field(default=None)
    title: str = Field(..., description="Document or note title")
    content_text: str = Field(..., description="Document body text")
    source: str = Field(default="user_upload")
    visibility: str = Field(default="private_user")


class KnowledgeRetrieveApiRequest(BaseModel):
    user_id: Optional[str] = Field(default=None)
    query_text: str = Field(..., description="Search query string")
    top_k: int = Field(default=5)
    trigger_web_fallback: bool = Field(default=True)


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
def nova_knowledge_ingest_endpoint(req: KnowledgeIngestApiRequest, db: Session = Depends(get_db)):
    """Ingests a document or note into PostgreSQL vector store."""
    try:
        from Backend.nova.knowledge import get_knowledge_manager, DocumentVisibility
        mgr = get_knowledge_manager()
        vis = DocumentVisibility(req.visibility) if req.visibility in [v.value for v in DocumentVisibility] else DocumentVisibility.PRIVATE_USER
        doc = mgr.ingest_document(
            db=db,
            title=req.title,
            content_text=req.content_text,
            user_id=req.user_id,
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
def nova_knowledge_retrieve_endpoint(req: KnowledgeRetrieveApiRequest, db: Session = Depends(get_db)):
    """Executes RAG retrieval with access control and web fallback."""
    try:
        from Backend.nova.knowledge import get_knowledge_manager
        mgr = get_knowledge_manager()
        k_payload, r_payload = mgr.retrieve_and_evaluate(
            db=db,
            query_text=req.query_text,
            user_id=req.user_id,
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


@router.post("/build-state", response_model=NovaState, summary="Assemble complete NOVA state for a user")
def build_state_endpoint(
    req: BuildStateRequest,
    db: Session = Depends(get_db),
):
    """Assembles and returns NovaState for the specified user and conversation parameters."""
    try:
        user_uuid: Optional[UUID] = None
        if req.user_id:
            try:
                user_uuid = UUID(req.user_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid user_id UUID format")

        state = build_nova_state(
            user_id=user_uuid,
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
):
    """Executes a full NOVA turn: loads context & memories, reasons, generates response, and extracts memory."""
    try:
        result = run_nova_graph(
            user_message=req.message,
            user_id=req.user_id,
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


@router.post("/memory", response_model=Optional[MemoryRecord], summary="Store a user memory")
def create_memory_endpoint(
    req: CreateMemoryRequest,
    db: Session = Depends(get_db),
):
    """Stores a user memory record after checking policy and deduplication."""
    mem_mgr = get_memory_manager()
    record = mem_mgr.remember(
        db,
        user_id=req.user_id,
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


@router.get("/memory/{user_id}", response_model=List[MemoryRecord], summary="List active memories for a user")
def list_memories_endpoint(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Lists active memories for a user with user_id isolation."""
    mem_mgr = get_memory_manager()
    return mem_mgr.retrieve(db, user_id=user_id, limit=50)


@router.delete("/memory/{memory_id}", summary="Archive or delete a user memory")
def delete_memory_endpoint(
    memory_id: str,
    user_id: str,
    hard_delete: bool = False,
    db: Session = Depends(get_db),
):
    """Archives or permanently deletes a specific memory record."""
    mem_mgr = get_memory_manager()
    success = mem_mgr.forget(db, user_id=user_id, memory_id=memory_id, hard_delete=hard_delete)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found or unauthorized")
    return {"status": "success", "memory_id": memory_id, "hard_delete": hard_delete}


@router.post("/memory/retrieve", response_model=List[MemoryRecord], summary="Retrieve & rank memories")
def retrieve_memories_endpoint(
    req: RetrieveMemoriesRequest,
    db: Session = Depends(get_db),
):
    """Retrieves and ranks relevant memories for a user and query."""
    mem_mgr = get_memory_manager()
    return mem_mgr.retrieve(
        db,
        user_id=req.user_id,
        query_text=req.query_text,
        memory_types=req.memory_types,
        min_confidence=req.min_confidence,
        limit=req.limit,
    )
