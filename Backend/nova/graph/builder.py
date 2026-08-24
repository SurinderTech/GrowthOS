"""
Backend/nova/graph/builder.py

LangGraph StateGraph Builder & Compiled Execution Engine for NOVA.

Orchestrates the state machine:
START → load_context → reason → route_decision ──┬──► direct_answer ──► generate_response ──► update_memory ──► END
                                                ├──► knowledge ──────► execute_knowledge ──┤
                                                └──► research ───────► execute_research ──┘
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from uuid import UUID

from langgraph.graph import StateGraph, START, END
from sqlalchemy.orm import Session

from Backend.nova.graph.nodes import (
    load_context_node,
    reason_node,
    knowledge_node,
    plan_node,
    progress_node,
    adapt_node,
    resource_node,
    research_node,
    response_node,
    critic_node,
    memory_update_node,
)
from Backend.nova.types import NovaState

logger = logging.getLogger("growthos.nova.graph.builder")


def route_decision(state: Dict[str, Any]) -> str:
    """
    Conditional edge router evaluating the reasoning output.
    Routes to:
    - 'execute_knowledge' when user document / study notes context is requested
    - 'execute_plan' when goal decomposition / roadmap is requested
    - 'execute_progress' when execution event / progress context is requested
    - 'execute_adaptive' when adaptive replanning / goal change is requested
    - 'execute_resource' when personalized learning resources are requested
    - 'execute_research' when current/recent web information is required
    - 'generate_response' for direct answers
    """
    route = state.get("route", "direct_answer")
    logger.info("[GRAPH_ROUTER] Routing decision: %s", route)

    if route == "knowledge":
        return "execute_knowledge"
    elif route == "plan":
        return "execute_plan"
    elif route == "progress":
        return "execute_progress"
    elif route == "adapt":
        return "execute_adaptive"
    elif route == "resource":
        return "execute_resource"
    elif route == "research":
        return "execute_research"
    elif route == "request_clarification":
        return "generate_response"
    return "generate_response"


def retry_decision(state: Dict[str, Any]) -> str:
    """
    Conditional edge router evaluating Critic verification results.
    Routes to:
    - 'update_memory' when PASS, ASK_CLARIFICATION, or ABORT
    - 'generate_response' when REVISE
    - 'execute_research' when RESEARCH_AGAIN
    - 'execute_knowledge' when RETRIEVE_AGAIN
    - 'execute_resource' when RESOURCE_AGAIN
    - 'reason' when REPLAN
    """
    action = state.get("critic_action", "pass")
    logger.info("[GRAPH_ROUTER:critic] Evaluation action: %s", action)

    if action == "pass":
        return "update_memory"
    elif action == "revise":
        return "generate_response"
    elif action == "research_again":
        return "execute_research"
    elif action == "retrieve_again":
        return "execute_knowledge"
    elif action == "resource_again":
        return "execute_resource"
    elif action == "replan":
        return "reason"
    else:
        return "update_memory"


def build_nova_graph() -> Any:
    """
    Constructs and compiles the LangGraph StateGraph instance.
    """
    builder = StateGraph(dict)

    # Add Nodes
    builder.add_node("load_context", load_context_node)
    builder.add_node("reason", reason_node)
    builder.add_node("execute_knowledge", knowledge_node)
    builder.add_node("execute_plan", plan_node)
    builder.add_node("execute_progress", progress_node)
    builder.add_node("execute_adaptive", adapt_node)
    builder.add_node("execute_resource", resource_node)
    builder.add_node("execute_research", research_node)
    builder.add_node("generate_response", response_node)
    builder.add_node("critic", critic_node)
    builder.add_node("update_memory", memory_update_node)

    # Define Control Flow Edges
    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "reason")

    # Conditional Routing Edge
    builder.add_conditional_edges(
        "reason",
        route_decision,
        {
            "execute_knowledge": "execute_knowledge",
            "execute_plan": "execute_plan",
            "execute_progress": "execute_progress",
            "execute_adaptive": "execute_adaptive",
            "execute_resource": "execute_resource",
            "execute_research": "execute_research",
            "generate_response": "generate_response",
        },
    )

    builder.add_edge("execute_knowledge", "generate_response")
    builder.add_edge("execute_plan", "generate_response")
    builder.add_edge("execute_progress", "generate_response")
    builder.add_edge("execute_adaptive", "generate_response")
    builder.add_edge("execute_resource", "generate_response")
    builder.add_edge("execute_research", "generate_response")
    builder.add_edge("generate_response", "critic")

    # Conditional Retry Edge from Critic
    builder.add_conditional_edges(
        "critic",
        retry_decision,
        {
            "update_memory": "update_memory",
            "generate_response": "generate_response",
            "execute_research": "execute_research",
            "execute_knowledge": "execute_knowledge",
            "execute_resource": "execute_resource",
            "reason": "reason",
        },
    )

    builder.add_edge("update_memory", END)

    compiled_graph = builder.compile()
    logger.info("[GRAPH_BUILDER] NOVA LangGraph compiled with Critic & Verification loop")
    return compiled_graph


# Pre-compiled graph instance
_compiled_nova_graph: Optional[Any] = None


def get_nova_graph() -> Any:
    global _compiled_nova_graph
    if _compiled_nova_graph is None:
        _compiled_nova_graph = build_nova_graph()
    return _compiled_nova_graph


def run_nova_graph(
    *,
    user_message: str,
    user_id: Optional[UUID | str] = None,
    db: Optional[Session] = None,
    conversation_history: Optional[list] = None,
    override_profile: Optional[dict] = None,
) -> Dict[str, Any]:
    """
    Main entry point to execute a full NOVA turn through the LangGraph engine.

    Returns:
        Dict containing:
        - "response": Final assistant response text
        - "state": NovaState object
        - "execution_stage": Final stage string
    """
    logger.info("[GRAPH_EXECUTION] Starting NOVA turn for user_id=%s", user_id)

    initial_payload: Dict[str, Any] = {
        "user_id": str(user_id) if user_id else None,
        "user_message": user_message,
        "conversation_history": conversation_history or [],
        "override_profile": override_profile or {},
        "db": db,
    }

    try:
        # Re-initialize compiled graph to pick up dynamic updates
        graph = build_nova_graph()
        final_payload = graph.invoke(initial_payload)

        raw_state_dict = final_payload.get("nova_state", {})
        nova_state = NovaState.model_validate(raw_state_dict) if raw_state_dict else NovaState()

        response_text = final_payload.get("final_response") or nova_state.final_response or "Response completed."

        logger.info("[GRAPH_EXECUTION] NOVA turn completed successfully")
        return {
            "response": response_text,
            "state": nova_state,
            "execution_stage": final_payload.get("execution_stage", "turn_completed"),
        }
    except Exception as exc:
        logger.error("[GRAPH_EXECUTION] Exception during NOVA turn execution: %s", exc)
        # Failure-safe fallback
        fallback_state = NovaState()
        fallback_state.update_user_message(user_message)
        fallback_state.final_response = "I'm currently unable to complete your request, but your context has been saved."
        return {
            "response": fallback_state.final_response,
            "state": fallback_state,
            "execution_stage": "failed_safe",
        }
