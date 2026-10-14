# The Hermes TUI-gateway worker — PLAN-HERMES-PHASE2 sub-row P2-1.
#
# Mirrors `docker/opencode/`'s shape (base image, non-root user, an entrypoint
# that finishes the configuration from the environment and then execs the
# worker), with three differences the pinned source forces:
#
#   1. **Python 3.14, not 3.13.** `pyproject.toml` gates every core dependency
#      on `python_version >= '3.14'` and `[tool.uv] environments` names 3.14
#      only, so `uv.lock` resolves nothing else. Measured, not assumed.
#   2. **Deps come from the pin's own lock, over a NAMED BUILD CONTEXT.** The
#      pinned source is 18,248 files / 87 MB; copying it into the build context
#      would make a second copy of the pin (the defect L136 names) and a slow
#      context upload. `--build-context hermes_pin=<pin dir>` lets this file
#      COPY just the two manifests it needs, so only those bytes are sent.
#   3. **The source is mounted at run time, not baked in.** The image ships the
#      dependency closure; the pinned tree arrives as a read-only bind mount at
#      /hermes-src and is digest-verified by the entrypoint before anything
#      imports it. One copy of the pin, and a runtime assertion rather than a
#      build-time claim.
#
# Build (the compose file does this for you):
#   docker build \
#     --build-context hermes_pin=/path/to/hermes-agent-main \
#     -f docker/hermes/Dockerfile docker/hermes

FROM python:3.14-slim-bookworm

# curl for the uv installer; ca-certificates for TLS; git is NOT needed (no
# git-based dependency applies on linux x86_64 — the one `git+https` pin is
# android-only).
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# uv is the pinned source's own package manager — its lock is the supply-chain
# contract, so the install goes through uv rather than pip (which would
# re-resolve and could float a transitive version the lock deliberately pinned).
ENV UV_VERSION=0.9.28
RUN curl -fsSL "https://github.com/astral-sh/uv/releases/download/${UV_VERSION}/uv-x86_64-unknown-linux-gnu.tar.gz" \
    | tar -xz -C /usr/local/bin --strip-components=1 "uv-x86_64-unknown-linux-gnu/uv" \
    && uv --version

# Build the dependency closure from the PIN's manifests. `--no-install-project`
# because the project itself is the mounted source at run time; `--frozen`
# because the lock is the authority. `--no-dev` matches the runtime surface:
# the dev group is explicitly excluded upstream too (`[tool.uv] default-groups = []`).
COPY --from=hermes_pin pyproject.toml uv.lock /build/
RUN cd /build \
    && uv sync --frozen --no-install-project --no-dev --python 3.14 \
    && rm -rf /root/.cache/uv

ENV HERMES_VENV=/build/.venv
ENV PATH="/build/.venv/bin:${PATH}"
# The mounted tree must never be written to: a `__pycache__` would both fail on
# a read-only mount and change the digest the entrypoint verifies.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Non-root, exactly like the OpenCode image. State goes to a writable volume.
RUN useradd -m -s /bin/bash hermes \
    && mkdir -p /var/lib/hermes /hermes-src \
    && chown -R hermes:hermes /var/lib/hermes /build
USER hermes
WORKDIR /hermes-src

COPY --chown=hermes:hermes entrypoint.py verify_pin.py ws_host.py ws_entry.py /opt/hermes/

# A syntax error in these files used to surface only at container boot (the
# live run caught one). Compile-check at build time: a broken image fails
# HERE, in seconds, instead of in a FATAL log line after a 15-second boot.
RUN python3 -m py_compile /opt/hermes/entrypoint.py /opt/hermes/ws_host.py /opt/hermes/ws_entry.py

# The gateway speaks newline-delimited JSON-RPC on stdio, so for years this
# image exposed no port: the platform spawned the worker and owned its pipes
# (P2-3's adapter does exactly that). P2-8 changes that — the pinned worker's
# OWN WebSocket transport (`tui_gateway/ws.py`: the same `server.dispatch`,
# the identical wire) is mounted by `ws_host.py` and served by `ws_entry.py`
# in a thread beside the stdio channel, behind the pin's ticket auth, so the
# app container connects it over the Docker network by URL. The door only
# listens when `HERMES_WS_TOKEN` is set; unset, this process is the stdio
# worker it has always been (`docker-compose.hermes.yml` owns the default
# port 8091, internal to the network — never published to the host).
ENTRYPOINT ["python3", "/opt/hermes/entrypoint.py"]
CMD ["python3", "/opt/hermes/ws_entry.py"]
