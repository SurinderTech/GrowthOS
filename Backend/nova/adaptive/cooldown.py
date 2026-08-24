"""
Backend/nova/adaptive/cooldown.py

Adaptation Cooldown Manager for NOVA Adaptive Engine.
Enforces stability cooldowns between major plan replans to prevent plan thrashing.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

logger = logging.getLogger("growthos.nova.adaptive.cooldown")


class AdaptationCooldownManager:
    """
    Manages adaptation stability cooldowns.
    """

    def __init__(self, cooldown_hours: int = 24):
        self.cooldown_hours = cooldown_hours
        self._last_replan_times: Dict[str, datetime] = {}

    def is_cooldown_active(self, user_id: str, is_major_change: bool = False) -> bool:
        """
        Returns True if cooldown is active for user and major change is not requested.
        """
        if is_major_change:
            return False

        last_time = self._last_replan_times.get(str(user_id))
        if not last_time:
            return False

        elapsed = datetime.now(timezone.utc) - last_time
        if elapsed < timedelta(hours=self.cooldown_hours):
            logger.info("[COOLDOWN] Cooldown active for user %s (elapsed %.1fh < %dh)", user_id, elapsed.total_seconds() / 3600.0, self.cooldown_hours)
            return True

        return False

    def record_replan(self, user_id: str) -> None:
        """Records a completed replan timestamp for user."""
        self._last_replan_times[str(user_id)] = datetime.now(timezone.utc)
        logger.info("[COOLDOWN] Recorded replan for user %s", user_id)
