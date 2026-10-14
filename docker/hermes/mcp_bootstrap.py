"""Point the worker at the platform's MCP server — PLAN-HERMES-PHASE2 sub-row P2-9a.

WHY THIS FILE EXISTS
--------------------
`P2-9`'s requirement (§2.15) measured a capability the switchover would have
removed: the OpenCode-served chat can call **21 platform tools** through the
platform's own MCP server, and a Hermes-served chat cannot. The worker is not
the problem — the pinned source ships a complete MCP client
(`tools/mcp_tool_discovery.py`, `tools/mcp_tool.py`, `tools/mcp_tool_transport.py`)
and reads `mcp_servers` from `config.yaml` with `${VAR}` interpolation. Two
things were missing, both measured: **the MCP SDK was not installed** in the
worker image (the Dockerfile now asks uv for the pin's own `mcp` extra) and the
worker had **no `mcp_servers` config** at all.

This file supplies the second. It runs at boot, AFTER `verify_pin.py` has proven
the mounted tree is the pinned snapshot (never import the pin before that), and
BEFORE the worker is exec'd.

WHY IT IS A SUBPROCESS, LIKE `verify_pin.py`
--------------------------------------------
This container's stdout is the gateway's JSON-RPC channel: a stray `print` is a
corrupt frame from a client's point of view. The pin's own config modules are
CLI code and do print (its migration path prints banners). As a subprocess this
file's stdout is captured and discarded by the entrypoint, so the pin can be
imported freely and the frame channel stays clean. Its exit code is its verdict.

WHY IT USES THE PIN'S OWN WRITER
--------------------------------
`hermes_cli.mcp_config._save_mcp_server` is the function behind `hermes mcp add`.
Going through it rather than writing YAML here means the entry is validated by
the pin's own `validate_mcp_server_entry`, written atomically, and given the
pin's file permissions — and that `save_config`'s default-stripping pass is the
pin's own problem, not ours. Measured (rule 0b), so the round-trip is known to
hold: `mcp_servers` is deliberately ABSENT from `DEFAULT_CONFIG` (it is listed in
`_EXTRA_KNOWN_ROOT_KEYS`), so `_strip_default_values` cannot drop the section —
every leaf differs from the `None` default it would be compared against.

WHY THE CONFIG CARRIES A `${VAR}` PLACEHOLDER AND NOT THE KEY
-------------------------------------------------------------
`config.yaml` lives in a **persistent volume** (`mercato-hermes-state`). Writing
the credential into it would put the secret at rest, and rotating the key would
mean editing the volume. The placeholder is the pin's own documented form for
secrets, so the config is identical on every boot and survives a rotation. The
entrypoint is what resolves `MCP_SERVER_API_KEY` from the environment or the
shared key file and puts it into the worker's own environment, so the placeholder
always has something to resolve against.

The two proofs below are what make that safe, and they need TWO DIFFERENT READS
(measured — the first version of this file used the wrong one and correctly
refused to boot rather than accept a config it could not verify):

  · `read_raw_config()` is the file **as written** (its own docstring: "no
    defaults merged, no migration"). It answers *is the secret at rest?*
  · `load_config()` is the **env-expanded** view — `_load_config_impl` ends in
    `_expand_env_vars(normalized)`. It answers *does the runtime resolve it?*,
    because it is exactly what `_load_mcp_config()` reads when the agent
    discovers tools at turn time.

A config that cannot authenticate FAILS THE BOOT rather than producing 401s at
turn time.

Usage:
    python3 mcp_bootstrap.py [source_dir]

Environment:
    HERMES_MCP_URL          the platform MCP endpoint (default http://mcp:3001/mcp)
    HERMES_MCP_SERVER_NAME  the name the worker files it under (default open-mercato)
    MCP_SERVER_API_KEY      the credential the entrypoint resolved; ABSENT means
                            no entry is written and the worker runs without
                            platform tools (loudly, on stderr)
    HERMES_HOME             the state root whose config.yaml is written
    HERMES_SOURCE_DIR       the mounted pinned tree (default /hermes-src)
"""
import json
import os
import sys

DEFAULT_SOURCE_DIR = "/hermes-src"
DEFAULT_SERVER_NAME = "open-mercato"
DEFAULT_MCP_URL = "http://mcp:3001/mcp"
KEY_ENV = "MCP_SERVER_API_KEY"

# The pin's `${VAR}` syntax, not this file's invention — `tools/mcp_tool_config.py`
# owns the pattern (`_ENV_VAR_PATTERN = re.compile(r"\$\{([^}]+)\}")`) and
# `_interpolate_env_vars` resolves it through `agent.secret_scope.get_secret`,
# which reads `os.environ` in a single-profile deployment (measured).
PLACEHOLDER = "${" + KEY_ENV + "}"


def note(message):
    """stderr only — stdout belongs to the gateway's frame channel."""
    sys.stderr.write("[Hermes MCP] %s\n" % message)
    sys.stderr.flush()


def fail(message):
    note("FATAL: %s" % message)
    return 1


def main(argv):
    source = argv[1] if len(argv) > 1 else os.environ.get("HERMES_SOURCE_DIR", DEFAULT_SOURCE_DIR)
    server_name = os.environ.get("HERMES_MCP_SERVER_NAME", DEFAULT_SERVER_NAME).strip() or DEFAULT_SERVER_NAME
    url = os.environ.get("HERMES_MCP_URL", DEFAULT_MCP_URL).strip()
    key = os.environ.get(KEY_ENV, "").strip()

    if not key:
        # Fail-soft, and loud. The worker still serves chat; it just has no
        # platform tools. This mirrors the ws door's shape (no token ⇒ the door
        # does not listen): a deployment that cannot authenticate does not get a
        # config entry that would 401 on every turn. The entrypoint logs WHY it
        # could not resolve a credential.
        note("NO MCP CREDENTIAL — the worker starts WITHOUT the platform's MCP tools.")
        note("  The chat will have no platform tools until %s (or the" % KEY_ENV)
        note("  shared key file) is provided and the worker is restarted.")
        note("  No config entry was written; the volume is left untouched.")
        return 0

    if not url:
        return fail(
            "a credential is present but HERMES_MCP_URL is empty — refusing to "
            "write an entry that cannot connect."
        )

    if not os.path.isdir(source):
        return fail("no pinned source at %s to write the config with." % source)

    # The pin, imported only now. The entrypoint verified its digest first; this
    # process exists so that the pin's CLI-shaped imports cannot reach stdout.
    if source not in sys.path:
        sys.path.insert(0, source)
    try:
        from hermes_cli.config import load_config, read_raw_config
        from hermes_cli.mcp_config import _save_mcp_server
    except Exception as exc:
        return fail("the pin's config modules did not import (%r)." % (exc,))

    entry = {"url": url, "headers": {"x-api-key": PLACEHOLDER}}
    try:
        if not _save_mcp_server(server_name, entry):
            return fail(
                "the pin's own writer REFUSED '%s' (validate_mcp_server_entry "
                "flagged it as a suspicious MCP entry)." % server_name
            )
    except Exception as exc:
        return fail("the pin's writer raised (%r)." % (exc,))

    # ── PROOF 1: the placeholder is what is AT REST ───────────────────────────
    # `read_raw_config()` is the file as written. `save_config` normalises and
    # strips defaults before writing, so "I called the writer" is not evidence
    # that the file holds what I asked for. Measured so the round-trip is known
    # to hold: `mcp_servers` is deliberately ABSENT from `DEFAULT_CONFIG` (it is
    # listed in `_EXTRA_KNOWN_ROOT_KEYS`), so `_strip_default_values` cannot drop
    # the section — every leaf differs from the `None` it would be compared to.
    try:
        stored = (read_raw_config().get("mcp_servers") or {}).get(server_name)
    except Exception as exc:
        return fail("the pin's raw reader raised after the write (%r)." % (exc,))
    if not isinstance(stored, dict):
        return fail(
            "wrote '%s' but the file does not hold it — the save did not survive "
            "normalisation." % server_name
        )
    if stored.get("url") != url:
        return fail("the file holds url %r, expected %r." % (stored.get("url"), url))
    if (stored.get("headers") or {}).get("x-api-key") != PLACEHOLDER:
        # This is the assertion that keeps the secret out of the volume. It is
        # also the one the first version of this file got wrong, by reading the
        # EXPANDED config and so seeing the resolved credential — it could not
        # tell a correct config from one with the secret written in the clear,
        # and refused to boot. Refusing was right; the read was not.
        return fail(
            "the credential is AT REST in config.yaml — the entry must hold the "
            "%s placeholder, not the value." % PLACEHOLDER
        )

    # ── PROOF 2: the runtime's view RESOLVES it ───────────────────────────────
    # `load_config()` is the pin's full load path — normalise, then expand
    # `${VAR}` from the process environment — i.e. exactly what
    # `_load_mcp_config()` reads at turn time. This is the leg that would
    # otherwise fail as a 401 mid-turn.
    try:
        live = (load_config().get("mcp_servers") or {}).get(server_name)
    except Exception as exc:
        return fail("the pin's reader raised after the write (%r)." % (exc,))
    if not isinstance(live, dict):
        return fail("'%s' does not survive the pin's own load path." % server_name)
    if (live.get("headers") or {}).get("x-api-key") != key:
        return fail(
            "%s did not resolve to the credential in this process's environment "
            "— the worker would send a literal placeholder and get a 401."
            % PLACEHOLDER
        )
    if "${" in json.dumps(live):
        return fail("the loaded entry still contains an unresolved ${...} placeholder.")

    # Redacted evidence only: the URL, and the credential's LENGTH. The value
    # itself is never printed — this log lands in `docker compose logs`.
    note("MCP BRIDGE READY")
    note("  server   : %s" % server_name)
    note("  url      : %s" % url)
    note("  header   : x-api-key = %s (resolved, %d chars, not printed)" % (PLACEHOLDER, len(key)))
    note("  config   : %s/config.yaml" % os.environ.get("HERMES_HOME", "?"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
