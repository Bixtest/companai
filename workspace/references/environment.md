# Environment

How to get a shell that can build the Starting Kit. Written down because two
things here are non-obvious and will otherwise be rediscovered painfully.

---

## Node 24 — project-local, not system-wide

The project declares `engines: { "node": "24.x" }` and `.nvmrc` says `24`. The
machine's system Node is v22.21.0 in `C:\Program Files\nodejs`, which needs
admin rights to change and is shared with other work.

So Node 24 lives **inside the workspace** and is used only here:

```text
workspace/.toolchain/node24/    Node v24.19.0 (LTS "Krypton"), win-x64
```

Installed by downloading the official zip from `nodejs.org/dist/v24.19.0/` and
verifying its SHA-256 against the published `SHASUMS256.txt`:

```text
57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73
```

Nothing outside `workspace/` was modified. Removing the folder undoes it.

### Use it

**Every** command that touches the codebase must put it first on `PATH`:

```bash
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH"
```

Verify before doing anything that matters:

```bash
node --version    # must print v24.19.0
```

`v22.x` means the export was missed and the result cannot be trusted.

### Why this matters, not just tidiness

The whole point of the baseline check is to find out whether *this platform*
builds. Running it on a Node version the authors did not target would produce a
result about our environment rather than about the platform — a false finding, of
exactly the kind this project has already had to correct twice.

## Yarn 4.17.1 — through Corepack, not a global shim

`corepack enable` fails on this machine: it tries to write shims into
`C:\Program Files\nodejs` and has no admin rights.

Two working routes, either is fine:

```bash
corepack yarn <command>          # preferred — explicit, no setup
```

or the shims installed to a user-writable directory:

```text
~/.corepack-bin/    yarn, yarnpkg, pnpm, pnpx (+ .CMD/.ps1)
```

Do **not** run bare `yarn` — it is not on `PATH` and never will be here.

## Everything else

| | |
|---|---|
| Docker | 29.6.1, available — used for PostgreSQL and Redis via the repo's compose files |
| PostgreSQL | no local client; use Docker |
| Disk | ~39 GB free of 477 GB (92% used). Adequate, worth watching once images and databases land |

## The standard command prefix

Copy this to the top of any build/test/lint invocation:

```bash
cd /c/Users/Ramzi/Downloads/companai/workspace/starting-kit && \
export PATH="/c/Users/Ramzi/Downloads/companai/workspace/.toolchain/node24:$PATH" && \
node --version && \
corepack yarn <command>
```

The `node --version` is deliberate: it makes every log say which Node produced
the result.
