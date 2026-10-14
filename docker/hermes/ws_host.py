"""The Hermes worker's WebSocket door — PLAN-HERMES-PHASE2 sub-row P2-8.

─────────────────────────────────────────────────────────────────────────────
WHY THIS FILE EXISTS
─────────────────────────────────────────────────────────────────────────────
The pinned worker speaks ONE protocol — newline-delimited JSON-RPC — over
TWO transports (`tui_gateway/ws.py`'s own header): the stdio channel the
container was born with (`tui_gateway.entry`), and a **WebSocket** transport
that reuses `server.dispatch` verbatim. The stdio channel is a child pipe:
only a process that SPAWNED the worker can speak it, and the app container
has neither a Python runtime nor the Docker socket to spawn anything
(measured, §2.14). The ws transport is a library a host mounts — this file
is that host, so the platform's app can connect the running worker over the
internal Docker network by URL.

Measured (rule 0b, 2026-10-14) — the pin's own mounting pattern, copied:
`evals/liveness/ws_orphan_reconnect.py:58-72` builds a FastAPI app with
`@app.websocket("/api/ws") async def ws(ws): await handle_ws(ws)` and serves
it with uvicorn in a THREAD over a PRE-BOUND socket. The worker image
already ships the stack (uvicorn 0.41.0 / starlette 1.3.1 / fastapi 0.133.1;
**aiohttp is NOT installed** — §2.14's first draft named it, corrected by
measurement).

─────────────────────────────────────────────────────────────────────────────
THE DOOR'S THREE LEGS — the pin's own ticket auth, end to end
─────────────────────────────────────────────────────────────────────────────
1. `GET /healthz` — process liveness for the HTTP leg. NOT the health gate:
   the gate is the client's `ping` over the ws connection itself.
2. `POST /internal/ws-ticket` — the **mint** leg, guarded by a shared secret
   (`HERMES_WS_TOKEN`, injected into BOTH containers by the compose file).
   Constant-time compared (`secrets.compare_digest`, the pin's own
   discipline). On success it mints a single-use, 30-second ticket with the
   PIN's own `mint_ticket` — not a lookalike.
3. `WS /api/ws?ticket=…` — the **upgrade** leg. The pin's `consume_ticket`
   validates and consumes it; a bad or missing ticket closes PRE-ACCEPT with
   code **4401** (the pin's own convention, `web_routers/chat_ws.py:140-145`)
   and `handle_ws` is never reached. Measured live (2026-10-14): because the
   close happens BEFORE the accept, ASGI/uvicorn refuses the UPGRADE — the
   client-visible failure is an **HTTP 403** on the handshake, not a 4401
   frame; the 4401 lives in the ASGI layer and the worker's log. On success
   `handle_ws(ws, auth_identity=…)` runs the session — the identical
   dispatch the stdio channel runs.

Why two legs rather than the shared secret on the upgrade URL: a ticket is
single-use with a 30s TTL, so a leaked URL is uninteresting — the pin's own
reasoning (`ws_tickets.py`'s docstring). A long-lived secret in a query
string that a proxy or browser history may log is not.

─────────────────────────────────────────────────────────────────────────────
WHAT THIS FILE DOES NOT DO
─────────────────────────────────────────────────────────────────────────────
It does not listen when `HERMES_WS_TOKEN` is unset (the launcher decides;
fail-closed per transport, the stdio channel unchanged). It does not accept
the dashboard's browser credentials (`?token=` sessions, subprotocol
tickets) — this is a service-to-service door with two legs, not a login. It
runs in the SAME process as the stdio entry beside it (the desktop
product's in-process shape, `hermes_cli/main.py:2680`), so the two
transports share one `tui_gateway.server` and its sessions.
"""

# NOTE: deliberately NO `from __future__ import annotations` here. With
# postponed annotations FastAPI resolves a parameter's string annotation
# against the MODULE's globals — and the imports below are lifted into
# `build_app()` so this module stays importable where the pin's tree is not
# on `sys.path`. The miss silently degrades `request: Request` into a
# REQUIRED QUERY FIELD and every mint call answers 422 (measured live). The
# def-time evaluation without the future import sees the local name — the
# real `Request`/`WebSocket` classes — and FastAPI injects them.
import logging
import os
import secrets
import socket as socket_module
import sys
import threading

log = logging.getLogger("hermes.ws_host")

#: The identity the platform's runtime is stamped with inside the worker.
#: `handle_ws`'s `auth_identity` is the sole identity authority downstream —
#: the `user_id` the agent is built with — so it is a fixed SERVICE identity,
#: never anything a client could supply through RPC params. The platform's
#: own tenant scoping rides the port's envelope, not this.
RUNTIME_USER_ID = "companai-runtime"
RUNTIME_PROVIDER = "companai"

#: The pin's own close code for a rejected ws credential
#: (`hermes_cli/web_routers/chat_ws.py:144`).
CLOSE_BAD_CREDENTIAL = 4401


def _log_line(message: str) -> None:
    """stderr only — this container's stdout is the stdio JSON-RPC channel."""
    sys.stderr.write("[Hermes ws] %s\n" % message)
    sys.stderr.flush()


def shared_token() -> str:
    """The shared secret the mint leg demands, read fresh per call.

    Read from the environment per call (rather than cached at import) so a
    test can set it, and so the value never outlives the process in a log.

    Stripped on BOTH sides (here and on the presented Bearer credential): the
    client trims the value it reads (`resolve-ai-runtime-port.ts`), and an
    unstripped value here would turn a stray newline or trailing space in one
    service's env into a permanent, silent 401.
    """
    return os.environ.get("HERMES_WS_TOKEN", "").strip()


def build_app():
    """The FastAPI application: the health leg, the mint leg, the upgrade leg.

    Imported lazily inside the function so this module stays importable (and
    testable) where the pin's tree is not on `sys.path` — `serve()` is the
    only caller in production.
    """
    from fastapi import FastAPI, HTTPException, Request, WebSocket
    from hermes_cli.dashboard_auth.ws_tickets import (
        TTL_SECONDS,
        TicketInvalid,
        consume_ticket,
        mint_ticket,
    )
    from tui_gateway.ws import handle_ws

    app = FastAPI(title="hermes-ws-host")

    @app.get("/healthz")
    async def healthz():
        return {"ok": True}

    @app.post("/internal/ws-ticket")
    async def ws_ticket(request: Request):
        """Mint one single-use ticket. The shared secret travels in the
        Authorization header — never on a URL — and is compared in constant
        time. Mirrors the shape of the pin's own mint route
        (`dashboard_auth/routes.py:556-564`) so a client written against the
        dashboard's contract needs no new knowledge."""
        expected = shared_token()
        if not expected:
            # The door must not serve unauthenticated: if the operator never
            # configured the secret, the launcher never bound the socket —
            # reaching here means the process was started without it.
            raise HTTPException(status_code=503, detail="ws door has no token configured")
        header = request.headers.get("authorization", "")
        presented = header[7:].strip() if header.lower().startswith("bearer ") else ""
        if not presented or not secrets.compare_digest(presented.encode(), expected.encode()):
            raise HTTPException(status_code=401, detail="invalid ws token")
        return {
            "ticket": mint_ticket(user_id=RUNTIME_USER_ID, provider=RUNTIME_PROVIDER),
            "ttl_seconds": TTL_SECONDS,
        }

    @app.websocket("/api/ws")
    async def ws_endpoint(ws: WebSocket):
        ticket = ws.query_params.get("ticket", "")
        if not ticket:
            # Close before accept — the pin's own convention: 4401 with a
            # reason the log and the client both read.
            await ws.close(code=CLOSE_BAD_CREDENTIAL, reason="auth: no_credential")
            return
        try:
            info = consume_ticket(ticket)
        except TicketInvalid as exc:
            await ws.close(code=CLOSE_BAD_CREDENTIAL, reason="auth: ticket_invalid")
            log.info("ws ticket rejected: %s", exc)
            return
        # Only the two identity fields are carried — bookkeeping such as
        # `minted_at` is not part of the identity contract (the pin's own
        # `_stamp_identity` carries exactly these).
        identity = {
            "user_id": info.get("user_id"),
            "provider": info.get("provider"),
        }
        log.info("ws upgrade accepted user=%s peer=%s", identity.get("user_id"), ws.client)
        await handle_ws(ws, auth_identity=identity)

    return app


def bind(host: str, port: int) -> socket_module.socket:
    """Bind the listening socket in the CALLER's thread.

    Binding here (before uvicorn starts) makes a port conflict fail in the
    launcher — one clear FATAL — instead of dying silently inside a thread
    the stdio channel cannot see. The reference mounting binds the same way.
    """
    sock = socket_module.socket(socket_module.AF_INET, socket_module.SOCK_STREAM)
    sock.setsockopt(socket_module.SOL_SOCKET, socket_module.SO_REUSEADDR, 1)
    sock.bind((host, port))
    sock.listen(128)
    return sock


def serve(sock: socket_module.socket) -> threading.Thread:
    """Serve the app on *sock* in a daemon thread.

    A daemon thread by design: the container's main thread is the stdio
    entry, and when IT ends (stdin EOF / container stop) the process ends —
    today's behaviour, unchanged. `uvicorn.Server.run(sockets=…)` is the
    reference mounting's own call shape (`ws_orphan_reconnect.py:69-71`).
    """
    import uvicorn

    server = uvicorn.Server(
        uvicorn.Config(build_app(), log_level="error", lifespan="off")
    )
    thread = threading.Thread(
        target=server.run, kwargs={"sockets": [sock]}, name="hermes-ws-host", daemon=True
    )
    thread.start()
    return thread


def main() -> int:
    """Entry point: read the config, bind, serve, and WAIT forever.

    Used only when the ws host is run as its own process (a hand-driven
    diagnostic); the container's `ws_entry.py` calls `bind`/`serve` directly
    so the stdio entry owns the main thread.
    """
    logging.basicConfig(level=logging.INFO)
    host = os.environ.get("HERMES_WS_HOST", "0.0.0.0")
    port = int(os.environ.get("HERMES_WS_PORT", "8091"))
    if not shared_token():
        _log_line("HERMES_WS_TOKEN is not set — refusing to serve the ws door")
        return 1
    sock = bind(host, port)
    _log_line("listening on %s:%s (ticketed)" % (host, port))
    serve(sock)
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
