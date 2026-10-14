"""The Hermes worker's entrypoint — PLAN-HERMES-PHASE2 sub-row P2-1.

Mirrors `docker/opencode/entrypoint.sh`'s job — finish the configuration from
the environment, then `exec` the worker — in Python, because the configuration
this worker needs is a digest check rather than a generated JSON file.

Order matters and is deliberate:

  1. **Verify the pin first.** Nothing is imported from the mounted tree until
     the bytes are proven to be the pinned snapshot. A worker that boots the
     wrong revision is worse than one that refuses to boot.
  2. **Resolve state.** `HERMES_HOME` is the state root (measured: it is an
     environment override in `hermes_constants.get_default_hermes_root`), and it
     must be writable while the mounted source is read-only.
  3. **Resolve the MCP credential, then write the worker's MCP entry** (`P2-9a`).
     The entry names the platform's MCP server so the chat can call the same
     platform tools an OpenCode-served chat can. See `resolve_mcp_key` and
     `mcp_bootstrap.py`; the credential is carried in the WORKER'S environment,
     never written into the state volume.
  4. **Exec the command** (the image's CMD) from the source directory, so
     `python -m tui_gateway.entry` resolves the way it does on a bare install.

Everything this file prints goes to **stderr**, never stdout. That is the same
rule the gateway itself follows (measured: `server.py` reserves stdout for
frames and sends stray prints to stderr) — this container's diagnostics share
the process's stdout with the JSON-RPC channel, so a log line on stdout would
be a corrupt frame from a client's point of view. `docker compose logs` still
shows them, because it merges both streams. That rule is also why the MCP
bootstrap runs as a SUBPROCESS with its stdout discarded: the pin's config
modules are CLI code and do print.
"""
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.environ.get("HERMES_SOURCE_DIR", "/hermes-src")
STATE_DIR = os.environ.get("HERMES_HOME", "/var/lib/hermes")

# The credential the worker sends to the platform's MCP server. The NAME is the
# pin's own convention: `config.yaml` holds the literal placeholder
# `${MCP_SERVER_API_KEY}` and `tools/mcp_tool_config._interpolate_env_vars`
# resolves it from the process environment at read time. So this process has to
# put it there — see `resolve_mcp_key`.
MCP_KEY_ENV = "MCP_SERVER_API_KEY"
MCP_KEY_FILE_DEFAULT = "/run/mcp-shared/mcp-api-key"
# How long to wait for that file when the environment does not carry the key.
# The `mcp` service provisions it after its own boot, so a cold start of both
# stacks races; this bound is the race's ceiling. It is only ever paid when the
# key is genuinely absent — the normal path reads the environment and waits zero.
MCP_KEY_WAIT_DEFAULT = 60


def log(message):
    sys.stderr.write("[Hermes] %s\n" % message)
    sys.stderr.flush()


def fail(message):
    sys.stderr.write("[Hermes] FATAL: %s\n" % message)
    sys.stderr.flush()
    raise SystemExit(1)


def resolve_mcp_key():
    """`(key, source)` — the MCP credential, from the environment or the shared file.

    The environment wins, exactly as `docker/opencode/entrypoint.sh` orders it
    (`MCP_SERVER_API_KEY` first, then `MCP_SERVER_API_KEY_FILE`). Returns
    `("", reason)` when neither carries a value; that is NOT an error — a
    deployment that does not use the platform's MCP server is a legitimate
    deployment, and the bootstrap handles the absence loudly.
    """
    key = os.environ.get(MCP_KEY_ENV, "").strip()
    if key:
        return key, "the environment"

    path = os.environ.get("MCP_SERVER_API_KEY_FILE", MCP_KEY_FILE_DEFAULT).strip()
    if not path:
        return "", "no %s and no key file configured" % MCP_KEY_ENV

    try:
        wait = max(0, int(os.environ.get("HERMES_MCP_KEY_WAIT_SECONDS", MCP_KEY_WAIT_DEFAULT)))
    except ValueError:
        wait = MCP_KEY_WAIT_DEFAULT

    deadline = time.monotonic() + wait
    announced = False
    while True:
        try:
            with open(path, "r", encoding="utf-8") as handle:
                key = handle.read().strip()
            if key:
                return key, "the key file %s" % path
        except OSError:
            pass
        if time.monotonic() >= deadline:
            return "", "no %s and no readable key at %s" % (MCP_KEY_ENV, path)
        if not announced:
            log("waiting up to %ds for the MCP key at %s ..." % (wait, path))
            announced = True
        time.sleep(1)


def main(argv):
    command = argv[1:] or ["python3", "-m", "tui_gateway.entry"]

    log("verifying the pinned Hermes source at %s" % SOURCE_DIR)
    verify = os.path.join(HERE, "verify_pin.py")
    if os.path.exists(verify):
        # The one subprocess this entrypoint runs before the bootstrap: the
        # digest check is a self-contained program so its exit code is its verdict.
        result = subprocess.run([sys.executable, verify, SOURCE_DIR])
        if result.returncode != 0:
            fail("the mounted source did not verify as the pinned snapshot")
    else:
        fail("verify_pin.py is missing from the image (%s)" % verify)

    if not os.path.isdir(SOURCE_DIR):
        fail("no Hermes source mounted at %s" % SOURCE_DIR)

    try:
        os.makedirs(STATE_DIR, exist_ok=True)
    except OSError as exc:
        fail("HERMES_HOME %s is not writable (%s)" % (STATE_DIR, exc))
    os.environ["HERMES_HOME"] = STATE_DIR

    # The provider/model contract is the same one the platform already speaks
    # for OpenCode (`OM_AI_PROVIDER` / `OM_AI_MODEL`). Hermes has its own model
    # configuration, so these are recorded on the run rather than translated
    # here: P2-3's adapter is where a provider choice becomes a gateway call.
    log("HERMES_HOME=%s" % STATE_DIR)
    if os.environ.get("OM_AI_PROVIDER"):
        log("OM_AI_PROVIDER=%s (recorded, not translated — see P2-3)" % os.environ["OM_AI_PROVIDER"])

    # ── P2-9a — THE MCP BRIDGE ───────────────────────────────────────────────
    # Put the credential into the WORKER'S environment before exec, so the
    # `${MCP_SERVER_API_KEY}` placeholder in config.yaml has something to
    # resolve against. The value is never printed and never written to the
    # volume; only its source and its length are logged.
    key, source = resolve_mcp_key()
    if key:
        os.environ[MCP_KEY_ENV] = key
        log("MCP credential resolved from %s (%d chars, not printed)" % (source, len(key)))
    else:
        log("MCP credential NOT resolved (%s)" % source)
        log("  the worker will start WITHOUT the platform's MCP tools")

    bootstrap = os.path.join(HERE, "mcp_bootstrap.py")
    if not os.path.exists(bootstrap):
        log("mcp_bootstrap.py is missing from the image — no MCP entry is written")
    else:
        # stdout is DISCARDED, not inherited: the pin's config modules are CLI
        # code and print, and this process's stdout is the gateway's frame
        # channel. Its verdict is its exit code.
        #
        # A non-zero exit is FATAL here on purpose. The bootstrap only refuses
        # when a credential WAS configured and the entry could not be made to
        # work — i.e. the deployment asked for the platform's tools and did not
        # get them. Booting anyway would silently reproduce the exact capability
        # regression `P2-9a` exists to prevent. (An absent credential is NOT
        # this case: the bootstrap exits 0 and the worker serves chat without
        # tools, loudly.)
        result = subprocess.run(
            [sys.executable, bootstrap, SOURCE_DIR], stdout=subprocess.DEVNULL
        )
        if result.returncode != 0:
            fail("the MCP bootstrap refused to configure the platform's MCP server")

    # PYTHONPATH is explicit so the mounted source wins over the image's own
    # copy of nothing: the venv at /build/.venv is already first on PATH.
    env = dict(os.environ)
    env["PYTHONPATH"] = SOURCE_DIR + (
        os.pathsep + env["PYTHONPATH"] if env.get("PYTHONPATH") else ""
    )

    log("exec: %s (cwd=%s)" % (" ".join(command), SOURCE_DIR))
    os.chdir(SOURCE_DIR)
    os.execvpe(command[0], command, env)


if __name__ == "__main__":
    main(sys.argv)
