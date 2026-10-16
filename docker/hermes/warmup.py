#!/usr/bin/env python3
"""Pre-fill the local model's prompt cache with the shared conversation prefix.

─────────────────────────────────────────────────────────────────────────────
WHY THIS EXISTS
─────────────────────────────────────────────────────────────────────────────
The first turn of a conversation on this stack is slow — measured at **~2,264 s
(~38 min)** for a 16,572-token prompt at 7.32 tok/s on 4 visible CPUs. Nothing
is asleep: the model container has `restart: unless-stopped` and had been up 15
hours when that was measured. The cost is that the model must *read the whole
shared instruction sheet before it can say anything*.

That sheet is not re-read every time. The model server keeps its prompt cache
in **process RAM** (`--cache-prompt`, default on; `--cache-ram`, default
8192 MiB), and measured turns prove it works: two sessions reused 16,724
tokens, and a live probe showed a cold call at 112.2 s followed by warm calls
at 1.2 s and 0.9 s (`cache_n` 1142 of 1148 — a DIFFERENT conversation reusing
the shared prefix, ~93x faster).

The gap is the **first turn after the model process starts**. Four model loads
were measured in two days (`RestartCount=0`, `OOMKilled=false` — so the restarts
came from outside the container). Each one emptied the RAM cache, and the next
human to open a chat paid the full 38 minutes.

─────────────────────────────────────────────────────────────────────────────
HOW IT WARMS — byte-faithful by construction, never reconstructed
─────────────────────────────────────────────────────────────────────────────
A warm-up that *rebuilds* the prompt would drift from the real one the moment
anything changed. So this does not rebuild anything. The worker already stores
**both halves of the exact request prefix** in its own state DB:

  · `sessions.system_prompt_hash` -> `system_prompts.prompt`
        the system message text ("You are Hermes Agent, ..."), measured at
        26,549 chars for the most recent session;
  · `sessions.tool_names`         -> `system_prompts.prompt`
        the tools array in literal OpenAI wire JSON, measured at 42,619 chars:
        `{"version": "0.0.0", "tools": [{"type": "function", ...}]}`.

26,549 + 42,619 = 69,168 chars — the exact figure the prompt audit measured.
This script reads those two rows and posts them back to the model server
unchanged. Same bytes in, same tokens rendered, same prefix cached. There is
nothing to keep in sync, because nothing is derived.

It posts to the **same endpoint the worker uses** (`/v1/chat/completions`), not
`/completion`, so the server applies the identical chat template — the
`<|im_start|>system` block with the `# Tools` section — rather than a rendering
this script would have to guess at.

`max_tokens: 1` is enough. Prefill happens before generation, so one token
forces the whole prefix through the model and into the cache while costing a
single decode step.

─────────────────────────────────────────────────────────────────────────────
WHY IT LOOPS
─────────────────────────────────────────────────────────────────────────────
Warming once at worker boot would miss the case that actually hurts: the model
process restarting underneath a long-lived worker. So it re-warms on an
interval. Each cycle reads back `usage.prompt_tokens_details.cached_tokens` and
reports which of the two states it found:

  · cached_tokens ~= 0          -> the cache was COLD; this cycle just filled it
  · cached_tokens ~= prompt     -> the cache was already WARM; the cycle was ~free

That makes the loop self-healing with no restart detection at all: a restarted
model reads cold on the next cycle and is re-warmed automatically. When the
cache is already warm the request costs one token of decode, so the interval
can be short without being wasteful.

─────────────────────────────────────────────────────────────────────────────
OPERATIONAL NOTES
─────────────────────────────────────────────────────────────────────────────
· **The read timeout must exceed a cold prefill** (~2,264 s measured on 4 CPUs,
  less on 8). Default 3600 s. A shorter one would abort every cold warm-up and
  the script would silently never do its job.
· **The state volume is mounted READ-WRITE, deliberately.** The script opens the
  DB itself with `mode=ro` and only ever SELECTs, so the mount's mode is about
  SQLite's needs, not ours. (This note used to cite the WAL rule — a reader
  needs write access to the `-shm` wal-index file. Measured 2026-10-16: the
  worker runs this DB with `journal_mode=DELETE`, NOT WAL, so that rule does not
  describe it. The mount stays rw because it is harmless, the script never
  writes, and a future WAL flip would need it.)
· **Stdlib only** (`urllib`, `sqlite3`, `json`). No dependency to install, so
  the service can run on a bare `python:3.14-slim-bookworm` — the same base the
  worker image is built from, so it is already on the host.
· **stdout is for the report; stderr is for the log.** `--once` prints one JSON
  line to stdout so a test can assert on it; everything narrative goes to
  stderr, matching the worker's own rule.

Run once, by hand, against a live stack:

    docker exec mercato-hermes-gateway python3 /opt/hermes/warmup.py --once
"""
import argparse
import json
import os
import sqlite3
import sys
import threading
import time
import urllib.error
import urllib.request

# The worker resolves `OPENAI_BASE_URL=http://model:8080/v1` from the shared
# `.env`; this is the same service on the same network, so the same default.
DEFAULT_BASE_URL = "http://model:8080/v1"
DEFAULT_DB = "/var/lib/hermes/state.db"
# Must beat a cold prefill. Measured: 2,264 s for 16,572 tokens on 4 CPUs.
DEFAULT_TIMEOUT = 3600
DEFAULT_INTERVAL = 600
# How soon to retry a SKIPPED cycle (a precondition that is not met yet).
RETRY_SECONDS = 30


def log(message):
    """Everything narrative goes to stderr — stdout carries the JSON report."""
    sys.stderr.write("[warmup] %s\n" % message)
    sys.stderr.flush()


def _env_int(name, default):
    try:
        return int(os.environ.get(name, "").strip() or default)
    except ValueError:
        return default


def read_shared_prefix(db_path):
    """The exact (system_prompt, tools) pair the newest session would send.

    Returns `(system_text, tools_list, session_id)`, or raises `LookupError`
    with a reason when the state DB has nothing usable yet. Read-only: the
    connection is opened `mode=ro` and only SELECTs are issued.

    Ordering is by `sessions.id DESC` on purpose. Session ids are
    `YYYYMMDD_HHMMSS_<hex>` (measured: `20261016_100451_37afd4`), so a plain
    descending sort on the id is a descending sort in time — no timestamp
    column to trust.
    """
    if not os.path.exists(db_path):
        raise LookupError("no state DB at %s" % db_path)

    con = sqlite3.connect("file:%s?mode=ro" % db_path, uri=True)
    try:
        row = con.execute(
            "SELECT s.id, sp.prompt, tp.prompt "
            "FROM sessions s "
            "LEFT JOIN system_prompts sp ON sp.hash = s.system_prompt_hash "
            "LEFT JOIN system_prompts tp ON tp.hash = s.tool_names "
            "WHERE s.system_prompt_hash IS NOT NULL AND s.tool_names IS NOT NULL "
            "ORDER BY s.id DESC LIMIT 1"
        ).fetchone()
    finally:
        con.close()

    if row is None:
        raise LookupError("no session in %s has both a system prompt and a tool pin yet" % db_path)

    session_id, system_text, tools_json = row
    if not system_text:
        raise LookupError("session %s has a prompt hash but no stored prompt" % session_id)

    try:
        pin = json.loads(tools_json)
    except (TypeError, ValueError) as exc:
        raise LookupError("session %s stores an unparseable tool pin (%s)" % (session_id, exc))

    # Two shapes are legal in that column: the modern `{"version", "tools"}`
    # object, and a legacy bare list of tool NAMES. Only the object carries the
    # wire definitions a warm-up needs; the legacy shape cannot be replayed, so
    # say so rather than sending something wrong.
    if isinstance(pin, dict) and isinstance(pin.get("tools"), list):
        tools = pin["tools"]
    elif isinstance(pin, list):
        raise LookupError(
            "session %s stores the legacy NAME list, not wire definitions — nothing to replay"
            % session_id
        )
    else:
        raise LookupError("session %s stores an unrecognised tool pin shape" % session_id)

    if not tools:
        raise LookupError("session %s pins an EMPTY tool list — nothing to warm" % session_id)

    return system_text, tools, session_id


class Heartbeat(object):
    """Log a line every `interval` seconds while a long request is in flight.

    A cold warm-up holds the connection for ~38 minutes with nothing to show.
    Without this the service looks hung; with it, `docker compose logs` shows
    steady progress and the operator can tell prefill from a stuck socket.
    """

    def __init__(self, label, interval=60):
        self.label = label
        self.interval = interval
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)

    def _run(self):
        started = time.monotonic()
        while not self._stop.wait(self.interval):
            log("%s ... still running (%ds)" % (self.label, int(time.monotonic() - started)))

    def __enter__(self):
        self._thread.start()
        return self

    def __exit__(self, *exc):
        self._stop.set()
        return False


def post_json(url, payload, timeout):
    """POST `payload` as JSON; return the decoded response body."""
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        raw = response.read()
    try:
        return json.loads(raw.decode("utf-8"))
    except ValueError:
        raise RuntimeError("the model server returned non-JSON (%d bytes)" % len(raw))


def root_of(base_url):
    """The server ROOT behind an OpenAI-compatible base URL.

    The worker's `OPENAI_BASE_URL` is `http://model:8080/v1`, and the chat call
    goes under it (`/v1/chat/completions`). But llama.cpp's own control
    endpoints — `/props`, `/slots`, `/health` — live at the ROOT, NOT under
    `/v1`. Measured the hard way: probing `…/v1/props` 404s, and the warm-up
    read that as "the model is not up yet" and skipped every cycle.
    """
    base = base_url.rstrip("/")
    if base.endswith("/v1"):
        base = base[: -len("/v1")]
    return base


def probe_model(base_url, timeout=10):
    """Cheap liveness check — `/props` answers instantly and names the slots."""
    try:
        url = root_of(base_url) + "/props"
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:  # noqa: BLE001 — any failure here just means "not ready"
        return None


def cached_tokens_of(usage):
    """Read the cache-hit count, tolerating the two shapes builds emit.

    The worker itself parses `usage.prompt_tokens_details.cached_tokens`
    (`agent/transports/chat_completions.py:771-779`), so this build emits it;
    `timings.cache_n` is the fallback for builds that do not.
    """
    if not isinstance(usage, dict):
        return None
    details = usage.get("prompt_tokens_details")
    if isinstance(details, dict) and isinstance(details.get("cached_tokens"), int):
        return details["cached_tokens"]
    return None


def warm_once(config):
    """One cycle: read the shared prefix, replay it, report what the cache did."""
    started = time.monotonic()
    try:
        system_text, tools, session_id = read_shared_prefix(config["db"])
    except LookupError as exc:
        log("SKIP — %s" % exc)
        return {"ok": False, "skipped": str(exc)}

    props = probe_model(config["base_url"])
    if props is None:
        log("SKIP — the model server is not answering at %s yet" % config["base_url"])
        return {"ok": False, "skipped": "model not reachable"}

    log(
        "warming from session %s: system prompt %d chars + %d tool definitions"
        % (session_id, len(system_text), len(tools))
    )
    log("  model server reports %s slots" % props.get("total_slots", "?"))

    payload = {
        "model": config["model"],
        "messages": [{"role": "system", "content": system_text}],
        "tools": tools,
        # Prefill happens before generation, so one token is all it takes to
        # push the whole prefix through the model and into the cache.
        "max_tokens": 1,
        "stream": False,
        "cache_prompt": True,
    }
    url = config["base_url"].rstrip("/") + "/chat/completions"

    try:
        with Heartbeat("prefilling the shared prefix"):
            response = post_json(url, payload, config["timeout"])
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8", "replace")[:400]
        except Exception:  # noqa: BLE001
            pass
        log("FAIL — HTTP %s from the model server: %s" % (exc.code, detail))
        return {"ok": False, "error": "http %s" % exc.code, "detail": detail}
    except Exception as exc:  # noqa: BLE001 — a warm-up must never kill the service
        log("FAIL — %s: %s" % (type(exc).__name__, exc))
        return {"ok": False, "error": "%s: %s" % (type(exc).__name__, exc)}

    elapsed = time.monotonic() - started
    usage = response.get("usage") if isinstance(response, dict) else None
    prompt_tokens = usage.get("prompt_tokens") if isinstance(usage, dict) else None
    cached = cached_tokens_of(usage)
    if cached is None and isinstance(response, dict):
        cached = (response.get("timings") or {}).get("cache_n")

    if cached is None or not prompt_tokens:
        log("DONE in %.1fs — the server did not report cache details; cannot judge" % elapsed)
        return {"ok": True, "judged": False, "seconds": round(elapsed, 1)}

    # llama.cpp always re-evaluates the LAST prompt token (it needs its logits to
    # sample the first generated token), so a perfect hit still reports one or
    # two tokens short. Measured: 16,559 of 16,560 on a fully warm prefix. Judge
    # on the shortfall, with a floor so short prompts are not misread.
    # `cached_tokens` reports the cache state as the request STARTED, not what
    # the request LEFT BEHIND. So a cold cycle legitimately reports 0 even though
    # it just filled the cache — measured: `COLD -> warmed (0 of 16560 tokens now
    # cached)` after a 2,051 s prefill. Read it as "began cold, prefilled the
    # lot"; the NEXT cycle is what proves the fill, by reading ~N-1 back as a hit.
    tolerance = max(8, prompt_tokens // 100)
    if prompt_tokens - cached <= tolerance:
        verdict = "already WARM (%d of %d tokens reused)" % (cached, prompt_tokens)
    elif cached <= tolerance:
        verdict = ("COLD -> prefilled all %d tokens (the request began cold; "
                   "the next cycle should read them back as a hit)" % prompt_tokens)
    else:
        verdict = "PARTIAL (%d of %d tokens reused)" % (cached, prompt_tokens)
    log("DONE in %.1fs — %s" % (elapsed, verdict))

    return {
        "ok": True,
        "judged": True,
        "seconds": round(elapsed, 1),
        "session": session_id,
        "prompt_tokens": prompt_tokens,
        "cached_tokens": cached,
        "verdict": verdict,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description="Warm the local model's shared prompt prefix.")
    parser.add_argument("--once", action="store_true", help="run one cycle, print JSON, exit")
    args = parser.parse_args(argv)

    config = {
        "base_url": os.environ.get("WARMUP_MODEL_BASE_URL", DEFAULT_BASE_URL).strip() or DEFAULT_BASE_URL,
        "db": os.environ.get("WARMUP_STATE_DB", DEFAULT_DB).strip() or DEFAULT_DB,
        "model": os.environ.get("WARMUP_MODEL_NAME", os.environ.get("HERMES_MODEL", "")).strip() or "local-model",
        "timeout": _env_int("WARMUP_TIMEOUT_SECONDS", DEFAULT_TIMEOUT),
        "interval": _env_int("WARMUP_INTERVAL_SECONDS", DEFAULT_INTERVAL),
    }

    if args.once:
        result = warm_once(config)
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()
        return 0 if result.get("ok") else 1

    if os.environ.get("WARMUP_ENABLED", "1").strip() in ("0", "false", "no"):
        log("WARMUP_ENABLED is off — the service is idle")
        while True:
            time.sleep(3600)

    log(
        "starting: model=%s db=%s interval=%ds timeout=%ds"
        % (config["base_url"], config["db"], config["interval"], config["timeout"])
    )
    while True:
        result = warm_once(config)
        if result.get("skipped"):
            # A SKIP is a precondition that is not met YET — the model server is
            # still starting, or no session has stored a prefix yet. Retry
            # promptly, so the warm-up lands the moment the stack is ready
            # instead of idling out a whole interval first. A completed cycle
            # (warm or cold) waits the full interval, because the only thing
            # that can invalidate it is a model restart.
            time.sleep(RETRY_SECONDS)
        else:
            time.sleep(max(30, config["interval"]))


if __name__ == "__main__":
    raise SystemExit(main())
