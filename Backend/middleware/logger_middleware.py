# backend/middleware/logger_middleware.py
import time
import traceback
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from Backend.utils.logger import (
    log_incoming_request,
    log_response_success,
    log_response_warning,
    log_response_error,
)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "127.0.0.1"
        method = request.method
        path = request.url.path

        # Ignore noise like docs polling or favicon
        is_quiet = path in ["/docs", "/openapi.json", "/favicon.ico"]

        try:
            response: Response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000.0
            status_code = response.status_code

            if not is_quiet:
                if status_code < 400:
                    log_response_success(method, path, status_code, duration_ms)
                elif status_code < 500:
                    log_response_warning(method, path, status_code, duration_ms, detail=f"HTTP {status_code}")
                else:
                    if not getattr(request.state, "error_logged", False):
                        request.state.error_logged = True
                        log_response_error(method, path, status_code, duration_ms, detail=f"HTTP {status_code} returned")

            return response
        except Exception as exc:
            duration_ms = (time.time() - start_time) * 1000.0
            tb_str = traceback.format_exc()
            if not getattr(request.state, "error_logged", False):
                request.state.error_logged = True
                log_response_error(
                    method=method,
                    path=path,
                    status_code=500,
                    duration_ms=duration_ms,
                    detail=str(exc),
                    exception=exc,
                    tb_str=tb_str,
                )
            raise exc


def setup_exception_handlers(app):
    """Registers global exception handlers for FastAPI to format logs and error responses."""

    @app.exception_handler(HTTPException)
    async def custom_http_exception_handler(request: Request, exc: HTTPException):
        method = request.method
        path = request.url.path
        
        if not getattr(request.state, "error_logged", False):
            request.state.error_logged = True
            if exc.status_code >= 500:
                log_response_error(
                    method=method,
                    path=path,
                    status_code=exc.status_code,
                    duration_ms=0.0,
                    detail=str(exc.detail),
                    exception=exc,
                )
            elif exc.status_code >= 400:
                log_response_warning(
                    method=method,
                    path=path,
                    status_code=exc.status_code,
                    duration_ms=0.0,
                    detail=str(exc.detail),
                )

        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def custom_global_exception_handler(request: Request, exc: Exception):
        method = request.method
        path = request.url.path
        tb_str = traceback.format_exc()

        if not getattr(request.state, "error_logged", False):
            request.state.error_logged = True
            log_response_error(
                method=method,
                path=path,
                status_code=500,
                duration_ms=0.0,
                detail=str(exc),
                exception=exc,
                tb_str=tb_str,
            )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Internal Server Error: {str(exc)}"},
        )
