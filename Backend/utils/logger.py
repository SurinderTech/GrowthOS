# backend/utils/logger.py
import sys
import os
import time
import traceback
from datetime import datetime

# ANSI Color codes for clean terminal output
COLOR_RESET = "\033[0m"
COLOR_BOLD = "\033[1m"
COLOR_DIM = "\033[2m"

COLOR_RED = "\033[91m"
COLOR_GREEN = "\033[92m"
COLOR_YELLOW = "\033[93m"
COLOR_BLUE = "\033[94m"
COLOR_MAGENTA = "\033[95m"
COLOR_CYAN = "\033[96m"
COLOR_WHITE = "\033[97m"

# Enable ANSI colors on Windows terminals
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass


def _safe_print(text: str):
    """Safely prints strings to stdout without UnicodeEncodeError on Windows cp1252."""
    try:
        print(text)
    except UnicodeEncodeError:
        # Fallback to ascii replacement if stdout encoding fails
        clean_text = text.encode(sys.stdout.encoding or "utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8")
        print(clean_text)


def _get_timestamp() -> str:
    return datetime.now().strftime("%H:%M:%S")


def log_incoming_request(method: str, path: str, client_ip: str):
    """Logs an incoming HTTP request."""
    ts = _get_timestamp()
    _safe_print(
        f"{COLOR_DIM}[{ts}]{COLOR_RESET} {COLOR_CYAN}{COLOR_BOLD}[INCOMING]{COLOR_RESET} "
        f"{COLOR_BOLD}{method}{COLOR_RESET} {path} {COLOR_DIM}(from {client_ip}){COLOR_RESET}"
    )


def log_response_success(method: str, path: str, status_code: int, duration_ms: float, detail: str = ""):
    """Logs a successful HTTP response (2xx / 3xx)."""
    ts = _get_timestamp()
    dur = f"{duration_ms:.1f}ms"
    sign = f"[SUCCESS {status_code}]" if status_code < 300 else f"[REDIRECT {status_code}]"
    extra = f" | {detail}" if detail else ""
    _safe_print(
        f"{COLOR_DIM}[{ts}]{COLOR_RESET} {COLOR_GREEN}{COLOR_BOLD}{sign}{COLOR_RESET} "
        f"{COLOR_BOLD}{method}{COLOR_RESET} {path} {COLOR_DIM}({dur}){COLOR_RESET}{COLOR_GREEN}{extra}{COLOR_RESET}"
    )


def log_response_warning(method: str, path: str, status_code: int, duration_ms: float, detail: str = ""):
    """Logs a client-side warning response (4xx errors, bad input, unauthorized)."""
    ts = _get_timestamp()
    dur = f"{duration_ms:.1f}ms"
    reason = f" | Reason: {detail}" if detail else ""
    tag = "[UNAUTHORIZED 401]" if status_code == 401 else (
        "[NOT FOUND 404]" if status_code == 404 else f"[CLIENT ERROR {status_code}]"
    )
    _safe_print(
        f"{COLOR_DIM}[{ts}]{COLOR_RESET} {COLOR_YELLOW}{COLOR_BOLD}{tag}{COLOR_RESET} "
        f"{COLOR_BOLD}{method}{COLOR_RESET} {path} {COLOR_DIM}({dur}){COLOR_RESET}{COLOR_YELLOW}{reason}{COLOR_RESET}"
    )


def log_response_error(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    detail: str = "",
    exception: Exception = None,
    tb_str: str = ""
):
    """Logs a server-side error (5xx or uncaught exception) with stack trace banner."""
    ts = _get_timestamp()
    dur = f"{duration_ms:.1f}ms"

    lines = []
    lines.append(f"\n{COLOR_RED}{'='*80}{COLOR_RESET}")
    lines.append(
        f"{COLOR_RED}{COLOR_BOLD}[SERVER ERROR {status_code}] {method} {path} (Failed in {dur}){COLOR_RESET}"
    )
    if detail:
        lines.append(f"{COLOR_RED}{COLOR_BOLD}  Message:{COLOR_RESET} {COLOR_WHITE}{detail}{COLOR_RESET}")
    
    if exception:
        lines.append(f"{COLOR_RED}{COLOR_BOLD}  Exception Type:{COLOR_RESET} {type(exception).__name__}")
        lines.append(f"{COLOR_RED}{COLOR_BOLD}  Exception Details:{COLOR_RESET} {str(exception)}")

    if tb_str:
        lines.append(f"{COLOR_RED}{COLOR_BOLD}  Stack Traceback:{COLOR_RESET}")
        for line in tb_str.strip().splitlines():
            lines.append(f"    {COLOR_RED}|{COLOR_RESET} {line}")
    elif exception:
        tb = traceback.format_exc()
        if tb and "NoneType" not in tb:
            lines.append(f"{COLOR_RED}{COLOR_BOLD}  Stack Traceback:{COLOR_RESET}")
            for line in tb.strip().splitlines():
                lines.append(f"    {COLOR_RED}|{COLOR_RESET} {line}")

    lines.append(f"{COLOR_RED}{'='*80}{COLOR_RESET}\n")

    _safe_print("\n".join(lines))


def log_custom_error(title: str, message: str, exc: Exception = None):
    """Logs a custom internal system or background task error."""
    ts = _get_timestamp()
    lines = [f"\n{COLOR_RED}{COLOR_BOLD}[{ts}] ERROR in {title}:{COLOR_RESET} {message}"]
    if exc:
        tb = traceback.format_exc()
        if tb and "NoneType" not in tb:
            for line in tb.strip().splitlines():
                lines.append(f"  {COLOR_RED}|{COLOR_RESET} {line}")
    lines.append("")
    _safe_print("\n".join(lines))
