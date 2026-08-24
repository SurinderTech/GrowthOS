"""
Backend/nova/resources/__init__.py

NOVA Resource Intelligence & Personalized Resource Discovery Package (Step 7).
Exported symbols for resource items, candidate providers, signal evaluator, ranker, recommender, and manager.
"""

from Backend.nova.resources.types import (
    ResourceType,
    ResourceMode,
    ResourceInteractionType,
    ResourceItem,
    ScoredResource,
    ResourceBundle,
    ResourceRecommendationPayload,
    ResourceInteractionRecord,
)
from Backend.nova.resources.models import (
    ResourceModel,
    UserResourceModel,
    ResourceInteractionModel,
)
from Backend.nova.resources.providers import (
    BaseResourceProvider,
    WebResearchResourceProvider,
    RAGResourceProvider,
    UserProvidedResourceProvider,
    infer_resource_type_and_platform,
)
from Backend.nova.resources.searcher import ResourceSearcher, infer_resource_mode
from Backend.nova.resources.evaluator import ResourceEvaluator
from Backend.nova.resources.ranker import ResourceRanker
from Backend.nova.resources.recommender import ResourceRecommender
from Backend.nova.resources.manager import ResourceManager, get_resource_manager

__all__ = [
    "ResourceType",
    "ResourceMode",
    "ResourceInteractionType",
    "ResourceItem",
    "ScoredResource",
    "ResourceBundle",
    "ResourceRecommendationPayload",
    "ResourceInteractionRecord",
    "ResourceModel",
    "UserResourceModel",
    "ResourceInteractionModel",
    "BaseResourceProvider",
    "WebResearchResourceProvider",
    "RAGResourceProvider",
    "UserProvidedResourceProvider",
    "infer_resource_type_and_platform",
    "ResourceSearcher",
    "infer_resource_mode",
    "ResourceEvaluator",
    "ResourceRanker",
    "ResourceRecommender",
    "ResourceManager",
    "get_resource_manager",
]
