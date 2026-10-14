"""The worker's entry with the WebSocket door mounted — PLAN-HERMES-PHASE2 P2-8.

─────────────────────────────────────────────────────────────────────────────
WHY THIS FILE EXISTS
─────────────────────────────────────────────────────────────────────────────
Until `P2-7` the pinned worker was reached one way only: a client SPAWNED it
and owned its pipes. `P2-7` proved the worker serves a real turn that way;
what production needs is a door the platform's app container can reach over
the internal Docker network by URL — and the app container has neither a
Python runtime nor the Docker socket to spawn anything (measured, §2.14).
The pin's own answer is its ws transport (`tui_gateway/ws.py` — same
`server.dispatch`, identical newline-JSON wire), which is a library a host
mounts. `docker/hermes/ws_host.py` is that host; THIS file is the process
that runs it beside the stdio channel.

─────────────────────────────────────────────────────────────────────────────
THE PROCESS SHAPE — the desktop product's, exactly
─────────────────────────────────────────────────────────────────────────────
`hermes_cli/main.py:2680` (measured): *"Desktop chat uses the in-process
/api/ws gateway (tui_gateway.server._make_agent)"* — one process, one
`tui_gateway.server`, two transports. So:

  1. `import tui_gateway.entry` in the MAIN thread — the module's own import
     runs the pin's path hardening (`hermes_bootstrap.harden_import_path()`)
     and `tui_gateway.server`'s module init deterministically, before any
     thread exists. `handle_ws` then re-uses that same module instance.
  2. If `HERMES_WS_TOKEN` is set — the operator wants the door — bind the
     socket in the MAIN thread (a port conflict fails HERE, one clear
     FATAL, instead of dying in a thread the stdio channel cannot see), then
     serve uvicorn in a daemon thread. If it is UNSET, the door does not
     listen and the process is byte-for-byte the worker it has always been:
     the stdio channel alone. Fail-closed per transport.
  3. `tui_gateway.entry.main()` in the main thread, exactly as
     `python -m tui_gateway.entry` would have run it: process setup, the
     `gateway.ready` frame on the stdio channel, then the blocking stdin
     loop. When it returns (stdin EOF), the process ends — today's
     behaviour — and the daemon thread dies with it (container stop).

The pin's verification already happened: `entrypoint.py` digest-checks the
mounted source and execs this file only after it passes, so the code below
runs is proven to be the pin.

Everything this file prints goes to **stderr**, never stdout: this
container's stdout IS the stdio JSON-RPC channel (`tui_gateway/transport.py`
reserves it for frames), and a log line there would be a corrupt frame from
a client's point of view. `docker compose logs` merges both streams.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    # The image COPYs this file beside ws_host.py under /opt/hermes/.
    sys.path.insert(0, HERE)


def log(message):
    sys.stderr.write("[Hermes ws-entry] %s\n" % message)
    sys.stderr.flush()


def fail(message):
    sys.stderr.write("[Hermes ws-entry] FATAL: %s\n" % message)
    sys.stderr.flush()
    raise SystemExit(1)


def main():
    # 1. The pin's module init, in the main thread, before any thread exists.
    try:
        from tui_gateway import entry as stdio_entry
    except Exception as exc:  # noqa: BLE001 — a boot failure must be loud, not a traceback in a thread
        fail("could not import the pinned tui_gateway.entry: %s" % exc)

    token = os.environ.get("HERMES_WS_TOKEN", "")
    if not token:
        # The stdio channel alone — exactly the worker this container has
        # always been. The door opens the moment the operator sets the token
        # (and the matching HERMES_WS_TOKEN in the app service) and restarts.
        log("HERMES_WS_TOKEN is not set — the ws door is disabled; the stdio channel serves as before")
    else:
        # 2. Bind in the main thread: a failure is ONE clear FATAL, not a
        #    silent death inside a thread the stdio channel cannot see.
        try:
            import ws_host
        except Exception as exc:  # noqa: BLE001
            fail("could not import ws_host: %s" % exc)
        host = os.environ.get("HERMES_WS_HOST", "0.0.0.0")
        try:
            port = int(os.environ.get("HERMES_WS_PORT", "8091"))
        except ValueError:
            fail("HERMES_WS_PORT is not an integer: %r" % os.environ.get("HERMES_WS_PORT"))
        try:
            sock = ws_host.bind(host, port)
        except OSError as exc:
            fail("could not bind the ws door on %s:%s (%s)" % (host, port, exc))
        ws_host.serve(sock)
        log("the ws door is listening on %s:%s (ticketed; the app connects HERMES_GATEWAY_URL here)" % (host, port))

    # 3. The stdio channel, in the main thread, exactly as always.
    log("starting the stdio gateway channel")
    stdio_entry.main()
    log("the stdio channel ended (stdin EOF) — the process is exiting")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
