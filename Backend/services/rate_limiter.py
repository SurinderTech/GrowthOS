# Backend/services/rate_limiter.py
# Simple thread-safe in-memory sliding-window rate limiter for GrowthOS auth endpoints

import time
import threading
from collections import defaultdict
from fastapi import HTTPException, status

class RateLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._requests = defaultdict(list)

    def check_rate_limit(self, key: str, max_requests: int, window_seconds: int):
        now = time.time()
        with self._lock:
            # Clean up timestamps older than window_seconds
            timestamps = [t for t in self._requests[key] if now - t < window_seconds]
            if len(timestamps) >= max_requests:
                retry_after = int(window_seconds - (now - timestamps[0]))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Please try again in {max(1, retry_after)} seconds.",
                    headers={"Retry-After": str(max(1, retry_after))}
                )
            timestamps.append(now)
            self._requests[key] = timestamps

rate_limiter = RateLimiter()
