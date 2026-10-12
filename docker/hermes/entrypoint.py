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
  3. **Exec the command** (the image's CMD) from the source directory, so
     `python -m tui_gateway.entry` resolves the way it does on a bare install.

Everything this file prints goes to **stderr**, never stdout. That is the same
rule the gateway itself follows (measured: `server.py` reserves stdout for
frames and sends stray prints to stderr) — this container's diagnostics share
the process's stdout with the JSON-RPC channel, so a log line on stdout would
be a corrupt frame from a client's point of view. `docker compose logs` still
shows them, because it merges both streams.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.environ.get("HERMES_SOURCE_DIR", "/hermes-src")
STATE_DIR = os.environ.get("HERMES_HOME", "/var/lib/hermes")


def log(message):
    sys.stderr.write("[Hermes] %s\n" % message)
    sys.stderr.flush()


def fail(message):
    sys.stderr.write("[Hermes] FATAL: %s\n" % message)
    sys.stderr.flush()
    raise SystemExit(1)


def main(argv):
    command = argv[1:] or ["python3", "-m", "tui_gateway.entry"]

    log("verifying the pinned Hermes source at %s" % SOURCE_DIR)
    verify = os.path.join(HERE, "verify_pin.py")
    if os.path.exists(verify):
        # The one subprocess this entrypoint runs: the digest check is a
        # self-contained program so its exit code is its verdict.
        import subprocess

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
