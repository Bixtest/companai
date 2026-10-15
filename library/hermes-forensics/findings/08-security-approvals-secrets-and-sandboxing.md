# Batch 08 — Security, approvals, secrets and sandboxing

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (in plain words)

Everything so far assumed the AI is *ours*. This batch covers what happens when it isn't — or when it
simply makes a mistake. Four layers, from the smallest switch to the strongest wall:

1. **Approvals** — a dangerous shell command must be approved (or is refused).
2. **A hardline floor** — a short list of catastrophic commands is refused *no matter what*, even with
   every switch turned off.
3. **Write safety** — `write_file` / `patch` refuse protected paths and can be confined to a sandbox root.
4. **Isolation** — running the agent's commands in a container instead of on your machine.
5. **Secrets** — where credentials live, how they reach a child process, and how they are kept out of one.

Plus the gateway's **user authorization** (who may talk to the bot at all).

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/`) | Bytes |
|---|---:|
| `user-guide/security.md` | 62,501 |
| `user-guide/egress/iron-proxy.md` | 39,995 |
| `user-guide/egress/network-isolation.md` | 7,601 |
| `user-guide/secrets/index.md` | 5,045 |
| `user-guide/secrets/bitwarden.md` | 10,243 |
| `user-guide/secrets/onepassword.md` | 11,219 |
| `user-guide/secrets/command.md` | 3,283 |

| Code verified against | Evidence |
|---|---|
| `tools/approval.py` | the approval tool (1,000+ lines) |
| `tools/approval_detection.py` | **`HARDLINE_PATTERNS`** (line 107) — the always-on floor |
| `hermes_cli/approval_mode.py` | `VALID_APPROVAL_MODES = ("manual", "smart", "off")` (line 16) |
| `hermes_cli/config_defaults.py` | the `approvals` block |
| `tools/environments/docker.py` | `_BASE_SECURITY_ARGS` (307), `_NO_NEW_PRIVILEGES_ARGS`, `_DEFAULT_PIDS_LIMIT = "2048"` (322) |
| `tools/mcp_tool_config.py` | `_SAFE_ENV_KEYS` (147) |
| `tools/code_execution_env.py` | `_SAFE_ENV_PREFIXES` (25) |
| `tools/file_tools_write_guards.py` | protected-instruction basenames (189) |
| `tools/url_safety.py` | SSRF blocklist (99–120) |

---

## 2. Approvals — the everyday gate

### 2.1 Three modes

`approvals.mode` is one of **`smart`** (default) · **`manual`** · **`off`** — **VERIFIED** exactly:
`hermes_cli/approval_mode.py:16` `VALID_APPROVAL_MODES = ("manual", "smart", "off")`.

- **smart** — an auxiliary LLM assesses risk: low-risk commands auto-approved *for that command only*,
  genuinely dangerous ones auto-denied, uncertain ones escalated to a person.
- **manual** — always ask.
- **off** — no checks at all (equivalent to `--yolo`).

The mode is **profile-scoped configuration, not conversation state** — a nice detail from the code's own
docstring (`approval_mode.py:3–6`): changing it takes effect immediately because `approval.py` reloads
config on every check, and it **must not** rebuild the live agent or mutate its system prompt — which
would break the prompt cache.

### 2.2 The mode is context-aware — this is the design point

A dangerous command in a *waiting* conversation and the same command in an *unattended* run are different
problems. Hermes has **four** separate answers, all defaulting to `deny`:

| Key | Default | Context |
|---|---|---|
| `mode` | `smart` | interactive sessions |
| `cron_mode` | `deny` | scheduled jobs (nobody is watching) |
| `single_query_mode` | `deny` | `hermes chat -q` one-shot runs |
| `unattended_mode` | `deny` | webhook / msgraph_webhook / api_server |

**VERIFIED** (`config_defaults.py` `approvals` block): all three non-interactive keys are `"deny"`.
**Why `deny` and not "approve":** the code comment says it plainly — an unattended prompt has *"nobody to
answer"*, so it just blocks for the full timeout and the agent is forced to route around the block (often
via `execute_code`). `deny` blocks **instantly** and the agent must find another way. There is one
documented exception: an `api_server` client that *can* answer the card still gets asked.

The **timeout is 300 s**, and the doc explains why it is not smaller: *"60s proved too tight on
Telegram/Discord (the prompt expired before the user reached their phone)."* **VERIFIED**: `timeout: 300`.

### 2.3 YOLO — a switch that shows itself

`/yolo` (or `--yolo`, or `HERMES_YOLO_MODE=1`) bypasses all approval prompts for **the current session**.
It is saved with the session (so it survives a restart), and `/new` / `/resume` turn approvals back on.
Two visual reminders are permanent while it is on: a red banner at session start and a `⚠ YOLO` status-bar
fragment — **the switch is designed to be hard to forget**.

### 2.4 Mining your own approval history

`hermes approvals suggest` reads the approval history and suggests allowlist rules (`security.md:308`).
A small but telling feature: the system helps you **stop being asked** for the things you always allow.

---

## 3. The hardline floor — always on, no override

A short list of commands is refused **regardless of** `--yolo`, `approvals.mode: off`, cron's `approve`
mode, or clicking "allow always." **VERIFIED**: `tools/approval_detection.py:107` `HARDLINE_PATTERNS`.
The floor trips **before** the approval layer sees the command.

The doc's table and the code agree on the *substance*:

| Doc says | Code (`HARDLINE_PATTERNS`) |
|---|---|
| `rm -rf /` and variants | `"recursive delete of root filesystem"` (+ system dirs, + home dir) |
| bash fork bomb `:(){ :\|:& };:` | `"fork bomb"` |
| `mkfs.*` | `"format filesystem (mkfs)"` |
| `dd if=/dev/zero of=/dev/sd*` | `"dd to raw block device"` |
| pipe untrusted URL to `sh` | (covered by the general detection layer, not this list) |

The code's floor is actually **wider** than the doc's table: it also includes `kill -1`, `shutdown`/
`reboot`/`halt`/`poweroff`, `init 0|6`, `systemctl poweroff|reboot|halt|kexec`, `telinit 0|6`, and a
`> /dev/sd*` redirect rule.

**What the code shows that the doc only implies:** this is not a naive regex list. It is **paranoid about
quoting**, and the comments say why. Every command-name rule is `_CMDPOS`-anchored so that *`git commit -m
"…rm -rf /…"`* — the string as **data** — does **not** trip the floor; but a command handed to another
shell to execute (`sh -c` / `bash -c` / `eval`) **is** scanned raw, *"quoting is not a bypass."* The two
positionless rules (the `>` redirect and the fork bomb) are matched against a **quote-masked** variant.
The floor also **fails closed** on a command whose shell quoting can't be parsed: the error is
`malformed executable payload`.

**Why this is worth naming:** the floor is the floor *below* the off-switch. It is the one thing that
cannot be turned off from the chat, by design — and it is engineered against the obvious evasions rather
than declared.

---

## 4. Write safety — no prompt, just a refusal

Before `write_file` / `patch` touch disk, the path is checked against a denylist and an optional sandbox
root. A blocked write returns an **error immediately — there is no approval prompt and no chat override**
(`security.md:352`).

**Always-blocked categories** (even with no sandbox set): OS credential stores (`~/.ssh/`, `~/.aws/`,
`~/.kube/`, `/etc/sudoers`, `~/.netrc`); Hermes secret stores (`.env`, OAuth token files, the Bitwarden
cache, `vault/`, `browser-profile/`, `mcp-tokens/`, `pairing/`); and **Windows NT/device-namespace paths**
(`\??\…`, `\\.\…`, `\\?\UNC\…`).

**The Windows row is a real security finding, and the doc explains the mechanism:** merely *resolving* a
path like `\??\UNC\host\share` triggers outbound SMB authentication and can leak the user's **NTLM
hash** — so those prefixes are rejected for **reads too**, on every platform, *before* anything resolves
them. Ordinary `\\?\C:\…` and plain `\\server\share` are unaffected. **VERIFIED**: the guards file exists
and holds the protected-basename set (`file_tools_write_guards.py:189`).

### 4.1 The honest limit, stated by the docs

> *"The `terminal` tool runs as the same OS user and can still `cat` or overwrite denied paths via shell
> commands. The denylist reduces accidental damage and gives models a clear stop signal; it does not
> sandbox a hostile or compromised agent."* — `security.md:392`

This is exactly the right framing: **write guards are defense-in-depth, not a boundary.** A real boundary
is §5 (a container) or OS permissions.

### 4.2 `HERMES_WRITE_SAFE_ROOT`

When set, writes may only target paths inside the listed prefix(es); anything outside is **hard-blocked**
(not routed through approval). Set automatically in the official Docker image
(`HERMES_WRITE_SAFE_ROOT=/opt/data`). The docs give a genuinely useful operational warning: *"Do not add to
`~/.hermes/.env` casually"* — pin it to a project directory and the agent can no longer write
`~/.hermes/cron/jobs.json` or profile skills.

### 4.3 One sensible exception

`~/.ssh/config` is **approval-gated, not hard-blocked** — it holds no key material and editing it (host
aliases, `ProxyJump`) is routine; but since it can carry `ProxyCommand` / `Match exec` directives that
*run* commands, the write is never silent, and non-interactive callers (background jobs, ACP file bridge)
**fail closed**. Private keys and `authorized_keys` stay hard-blocked. That is a well-drawn line.

---

## 5. Isolation — the container

The `docker` terminal backend hardens every container. The doc quotes `_BASE_SECURITY_ARGS`, and here the
code and the doc **disagree in three ways** (recorded in §7) — but the *substance* is stronger than the
doc's abbreviated list:

| Flag | Purpose |
|---|---|
| `--cap-drop ALL` | drop every Linux capability |
| `--cap-add DAC_OVERRIDE` / `CHOWN` / `FOWNER` | the minimum package managers and bind-mounts need |
| `--security-opt no-new-privileges` | block privilege escalation (in a **separate** list) |
| `--tmpfs /tmp:rw,nosuid,size=512m` | a size-limited `/tmp` |
| `--tmpfs /var/tmp:rw,noexec,nosuid,size=256m` | no-exec `/var/tmp` |
| `--pids-limit` | a fork-bomb guard, **default 2048** (see §7) |

**The most instructive comment in this whole study** is at `docker.py:_DEFAULT_PIDS_LIMIT`. The old limit
was **256**, and *"measured on `hermes-sandbox:desktop`, the idle container is 2 tasks, Xvnc + Xfce + dbus
44, one Chromium with one tab 212, plus the agent's own agent-browser Chromium with two tabs 488. The old
256 was hit in normal use and every further `docker exec` … died with runc's 'procReady not received'."*
The new **2048** is chosen from a measurement, and is still three orders of magnitude under `pid_max`.
**This is the study's method vindicated in one comment:** a plausible-looking bound (256) was wrong in
practice, and the code carries the measurement that corrects it.

`SETUID`/`SETGID` are added **conditionally** (only when the container starts as root and an init must drop
privileges); `/run` is mounted per-image (hardened noexec by default, exec only for s6-overlay images);
and the `no-new-privileges` flag is **dropped** when snap-packaged Docker's AppArmor profile would turn it
into `exec: operation not permitted` (#9730). Every one of those is a real-world exception carried in the
code with its reason.

**Resource limits** (`container_cpu` 1, `container_memory` 5120 MB, `container_disk` 51200 MB,
`container_persistent` true) and the backend comparison table (local / ssh / docker / singularity / modal /
daytona / vercel_sandbox) are in the doc. The comparison's key column: for the **local** and **ssh**
backends the dangerous-command check runs; for every **container/cloud** backend it is **skipped** because
*the container is the boundary*.

---

## 6. Secrets and credentials

### 6.1 External secret managers

Hermes can pull keys from an external manager at startup instead of storing them in `.env` — **Bitwarden**
(`bws`), **1Password** (`op://`), and a **Command helper** for any CLI vault (`pass`, `keepassxc-cli`, …)
(`secrets/index.md`). The **bootstrap token** stays in `.env`; every other key can rotate centrally.

Multiple sources compose with a **three-rule precedence ladder** the doc states precisely: (1) your
`.env`/shell wins **unless** a source sets `override_existing: true`; (2) **mapped** sources outrank
**bulk** sources; (3) first source wins, later claims skipped **with a startup warning, never silently**.
Two safety properties are named: `override_existing` never lets one source clobber a value another already
claimed, and **no source can ever overwrite another source's bootstrap token**.

Every injected credential is **labelled with its origin** (`(from Bitwarden)`), and two profile knobs make
a shared vault safe across profiles: `secrets.preserve_existing` (named vars whose local value always
wins) and **profile aliasing** (a vault secret named `FOO_<PROFILE>` also hydrates the canonical `FOO` —
so a shared project can hold `TELEGRAM_BOT_TOKEN_MILLA` and the `milla` profile's adapter, which reads the
fixed name `TELEGRAM_BOT_TOKEN`, gets the right value automatically).

### 6.2 Keeping credentials out of children — the sanitizer

This is the security spine, and it appears in **four** places, consistently:

| Child | Mechanism | Verified |
|---|---|---|
| MCP stdio subprocesses | only `PATH, HOME, USER, LANG, LC_ALL, TERM, SHELL, TMPDIR` (+ `XDG_*`) pass through; everything else **stripped** | `tools/mcp_tool_config.py:147` `_SAFE_ENV_KEYS = frozenset({"PATH","HOME","USER","LANG","LC_ALL","TERM","SHELL","TMPDIR"})` |
| `execute_code` / `terminal` | same idea by **prefix** (`_SAFE_ENV_PREFIXES`) | `tools/code_execution_env.py:25` |
| cron `no_agent` scripts | environment sanitized (`_sanitize_subprocess_env`) | (batch 06) |
| subagents | inherit the parent's **credential pool** but not un-declared env | (batch 06) |

**VERIFIED — a genuine positive:** the MCP safe-env set in the doc (`PATH, HOME, USER, LANG, LC_ALL,
TERM, SHELL, TMPDIR` **plus any `XDG_*`**) matches `_SAFE_ENV_KEYS` **exactly**, and the code adds a
Windows launcher set (`APPDATA`, `SYSTEMROOT`, …) so Docker Desktop-style MCP plugins still discover their
tools — a documented-by-code exception the doc doesn't mention but which is correct.

**A declared variable is forwarded with the *owning profile's* value** — from that profile's `.env` or its
secret sources — even when the profile is served by a multi-profile gateway and *"its secrets never entered
the process environment"*. A profile's declared value **never reaches another profile's children**, and
the launch profile's `.env` credentials are dropped from children running for a served profile. **Provider
credentials cannot be declared at all** (the sanitizer rejects `OPENAI_API_KEY` etc.).

### 6.3 MCP credential hygiene

Error messages from MCP tools are **redacted** before reaching the LLM — GitHub PATs (`ghp_…`),
OpenAI-style (`sk-…`), Bearer tokens, and `token=` / `key=` / `API_KEY=` / `password=` / `secret=`
parameters are replaced with `[REDACTED]` (`security.md:723`).

### 6.4 Egress and SSRF

- **Website blocklist** — `security.website_blocklist` restricts which domains the web/browser tools may
  reach, enforced across `web_search`, `web_extract`, `browser_navigate` and all URL-capable tools
  (`security.md:732`).
- **SSRF protection** — all URL-capable tools validate before fetching, blocking private nets (RFC 1918),
  loopback, link-local (`169.254.0.0/16`), **CGNAT/RFC 6598** (`100.64.0.0/10` — Tailscale/WireGuard),
  and cloud metadata hostnames. **VERIFIED** (`tools/url_safety.py`): `_ALWAYS_BLOCKED_NETWORKS` includes
  `169.254.0.0/16` and the IPv6-mapped form, and the code names the exact metadata endpoints —
  `169.254.169.254` (AWS/GCP/Azure/DO/Oracle), `169.254.170.2` (ECS task IAM creds), `169.254.169.253`
  (Azure IMDS). The doc's SSRF list matches the code.
- **`iron-proxy` / network-isolation** (egress docs, ~48 KB combined) — a dedicated egress-control layer.
  Too large to treat fully here; carried as C8-6.

### 6.5 Gateway user authorization

Who may talk to the bot is checked in a fixed order (`security.md:412`):
**per-platform allow-all → DM pairing approved list → platform allowlist → global allowlist → global
allow-all.** The **DM pairing** system issues a code, an operator approves it, and access can be listed /
approved / revoked / cleared. This is the same "verified operator vs everyone else" idea seen in batch 07's
session attribution.

---

## 7. Divergence and boundary notes

- **DIVERGENCE 1 (docker flags — the doc quotes the wrong list).** `security.md:538` quotes
  `_BASE_SECURITY_ARGS` as containing `--security-opt no-new-privileges` and `--pids-limit 256`. In
  `tools/environments/docker.py`:
  - `no-new-privileges` is in a **separate** list `_NO_NEW_PRIVILEGES_ARGS`, and is **conditionally
    dropped** for snap-packaged Docker (`snap_compat`).
  - `--pids-limit` is **not in the base list at all** — it lives in `resource_args`, and
    `_DEFAULT_PIDS_LIMIT = "2048"`, **not 256**. The code's own comment records that **256 was hit in
    normal use** (a single Chromium with two tabs measured 488 tasks) and killed every further
    `docker exec`.
  So the doc's quote is a **stale snapshot of an older list**, and its `256` is a value the code
  **deliberately abandoned after measurement**. The doc's *intent* (capabilities dropped, escalation
  blocked, tmpfs sized) is correct; its *quoted list and number* are not.
- **DIVERGENCE 2 (minor, ordering).** The doc's approval-key table lists `smart_policy`,
  `denial_breaker_threshold`, and `destructive_slash_confirm` in some places; the config block also carries
  `denial_breaker_threshold: 3` and `mcp_reload_confirm: true`, which the doc covers — **no contradiction**,
  just a note that the config block is the fuller list.
- **Positive findings:** `VALID_APPROVAL_MODES` matches the doc's three modes exactly; the MCP
  `_SAFE_ENV_KEYS` matches the doc's safe list exactly; the SSRF blocklist matches the doc's list exactly;
  all four approval-mode defaults (`smart`/`deny`/`deny`/`deny`) match the doc.
- **The doc's own honest boundaries (three, all worth repeating):** write guards are *"defense-in-depth,
  not a hard boundary"* (the `terminal` tool can still `cat` a denied path); `approvals.deny` is *"a
  shell-command policy, not a complete shell interpreter or an OS capability sandbox"* — *"do not use a
  basename deny rule as a guarantee that a capability cannot be reached by other means"*; and the
  supervised-gateway lifecycle guard is *"non-overridable"* — user approval, YOLO and `force=True` do not
  bypass it.

---

## 8. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C8-1 | **Four context-aware approval modes**, all defaulting to `deny` (cron / single-query / unattended) — a direct model for the platform's own agent-approval policy | synthesis |
| C8-2 | The **hardline floor below the off-switch** (no override, quoting-aware, fails closed) — the platform's own always-on floor to define | synthesis |
| C8-3 | **Per-profile credential scoping** — a declared var resolves to the owning profile and never crosses — the exact pattern the platform's per-company isolation needs | batch 12 |
| C8-4 | **Env sanitization by allowlist, in four places** (MCP, code exec, cron scripts, subagents) — copy this uniformly | synthesis |
| C8-5 | **Write-vs-read asymmetry**: credential stores read-denied AND write-denied; project `.env` read-denied but writable — a useful, subtle policy shape | synthesis |
| C8-6 | **Egress control (`iron-proxy`, network isolation)** — read in full; a whole subsystem this batch only sampled | batch 11 / synthesis |
| C8-7 | The **measured pids limit** story (256 → 2048, with the Chromium task count in the comment) is the study's method in miniature — a caution against plausible-looking bounds | synthesis |
| C8-8 | **External secret managers with a labelled precedence ladder** — the platform's credential story should mirror the "origin label + first-wins + warning on conflict" design | batch 09 |

---

## 9. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High, and *felt* rather than configured: a dangerous command stops and asks; a
catastrophic one is refused whatever you typed; a write into `~/.ssh` or a `.env` is refused silently and
immediately; a command in an unattended cron run is denied by default instead of hanging; a leaked key in
an MCP error comes back redacted. The user does not have to *know* any of the mechanism — but every one of
these is the difference between an assistant you can leave alone and one you cannot. `/yolo` plus
`approvals.deny` ("let it do everything, except these, ever") is a usable power dial, and
`hermes approvals suggest` teaches the system your own habits.

**Q2 — VISION VALUE.** This is the **safety and trust foundation** of the platform vision, and it is the
batch most directly reusable by an AI-company OS. Three things map almost one-to-one: (1) **four
context-aware approval modes** with `deny` as the unattended default are exactly the policy an autonomous
workforce needs — an agent running a scheduled job or a webhook must fail closed, not wait forever;
(2) **the hardline floor** (a small, fixed, non-overridable set of catastrophes, engineered against quoting
evasions and failing closed on unparseable input) is the pattern for "some things are never allowed,
regardless of who asks"; (3) **per-profile credential scoping with origin-labelled sources** is the
mechanism by which many companies can share infrastructure without sharing secrets — the same isolation
question the platform answers with per-company keys. The docs' insistence on naming what each layer is
**not** (write guards are not a boundary; deny rules are not a sandbox) is itself the design principle to
carry: *state the threat model, then let the user choose the wall.*

**Learning lens (explicit).** Batch 06 = execution; batch 07 = the record; **batch 08 = the brake.** Where
the earlier batches asked what the AI can *do*, this one asks what it may *never* do — and how the system
proves it, rather than promising it.

---

*Batch 08 of 12 complete. Divergences found this batch: 2 (the docker `--pids-limit 256` /
`no-new-privileges` quote is stale — code uses a separate list and a measured 2048). Next:
`09-models-and-providers.md`.*
