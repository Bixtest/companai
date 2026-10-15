# Batch 05 — Tools, MCP and the gateway

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (in plain words)

Batch 01 named the tools; this batch is **how the tools work and how Hermes reaches outside itself**.

Three things, kept distinct:

1. **The tool registry** — the built-in set, and how it is grouped into *toolsets* you switch on/off.
2. **MCP** — the open standard for plugging in *external* tools (GitHub, a database, your own API)
   without writing any Hermes code.
3. **Tool Search** — the layer that stops a large tool collection from eating the context window.

**Why this batch matters for the platform:** the owner's "nuggets" idea — capabilities that can be called
inside a workspace — is, mechanically, **a tool**. How Hermes registers, groups, filters and defers tools
is therefore the seam where the platform's own functions would attach.

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/`) | Bytes |
|---|---:|
| `user-guide/features/mcp.md` | 52,316 |
| `reference/mcp-config-reference.md` | 22,795 |
| `user-guide/features/tool-search.md` | 18,089 |
| `user-guide/features/tool-gateway.md` | 16,609 |
| `developer-guide/adding-tools.md` | 6,704 |
| **Total** | **116,513** |

| Code verified against | Evidence |
|---|---|
| `tools/` | **278** tool modules; **26** dedicated `mcp_*.py` modules |
| `tools/registry.py` | the tool registry and `register_toolset_alias` (line 569) |
| `toolsets.py` | `_HERMES_CORE_TOOLS` (imported by `agent/memory_manager.py:471`,`:689`) |
| `tools/mcp_tool.py`, `mcp_tool_config.py`, `mcp_tool_discovery.py` | MCP registration/discovery |

---

## 2. The tool registry and toolsets, in plain words

Every tool belongs to **exactly one toolset** — a named bundle. Toolsets come in four kinds
(`toolsets-reference.md`):

- **Core** — one logical group (`file` bundles `read_file`/`write_file`/`patch`/`search_files`).
- **Composite** — several core toolsets for a scenario (`debugging` = file + terminal + web;
  `coding` = a large bundle for software work).
- **Platform** — a full configuration for a deployment (`hermes-cli`, `hermes-acp`, `hermes-api-server`,
  `hermes-webhook`, `hermes-gateway`).
- **Dynamic** — generated at runtime: **every MCP server produces a `mcp-<server>` toolset**; plugins can
  register their own; users can define custom bundles in `config.yaml`.

**Switching:** per session (`hermes chat --toolsets web,file`), per platform (`config.yaml`), or
interactively (`hermes tools`, a curses UI at *tool* granularity). `all`/`*` expands to every registered
toolset — **except** a few deliberately opt-in ones.

**Two gating classes the docs name precisely** (`toolsets-reference.md:164–167`):
**capability-gated** tools appear only when their backend/credential is configured (browser,
`computer_use`, `code_execution`, cronjob); and **workflow-gated** tools — the `kanban` toolset — are
**not** turned on by `all`, *"because kanban tools mutate shared board state, so they stay off by default
even under `all`."* That is a considered safety default, not an oversight.

### 2.1 Platform toolsets — one product, many doors

The **platform toolsets** show how the same engine is tuned per surface. `hermes-acp` (the door this
platform uses) **drops** `clarify`, `cronjob`, `image_generate`, `text_to_speech`, `computer_use` and the
kanban tools — *"focused on coding tasks in IDE context."* `hermes-webhook` is a **restricted safe
subset**: only `web_search`, `web_extract`, `vision_analyze`, `clarify` — *"no terminal, file, or browser
access."*

**Why this matters:** Hermes has a **built-in notion of a reduced tool surface per entry point.** A
platform that exposes its AI through one door can point at a matching platform toolset rather than
hand-restricting tools itself.

---

## 3. MCP — reaching outside Hermes, in plain words

**MCP (Model Context Protocol)** lets Hermes connect to *external tool servers* — GitHub, databases, file
systems, internal APIs — so the agent can use tools that live elsewhere, **without writing a native Hermes
tool first**. Two transport kinds: **stdio** (a local process) and **HTTP** (remote; OAuth-capable). Tools
are discovered and registered **automatically at startup**.

**What you get** (`mcp.md:21–27`): access to external tool ecosystems; local and remote servers in one
config; automatic discovery; **per-server filtering** so only chosen tools are visible. Config lives under
`mcp_servers:` in `config.yaml`; the server's name produces a `mcp-<server>` toolset referenceable like any
other.

### 3.1 The catalog and the trust model

Hermes ships a **catalog of Nous-approved MCP servers** with one-click install. The catalog is
**manifest-versioned**, supports runtime `${ENV_VAR}` substitution (so credentials are injected at runtime,
not stored in the manifest), and has a **trust model** and **tool selection at install time**
(`mcp.md:58–311`). Servers needing your own OAuth app (no Dynamic Client Registration) are handled
explicitly.

**Per-server filtering has a documented precedence rule** (whitelist / blacklist / glob patterns, with
utility tools filterable too, `mcp.md:619–740`) — and the docs answer the edge case *"what happens if
everything is filtered out?"*.

**Why the trust model matters:** plugging in an external tool server is **giving the agent new powers**.
Hermes models that as a decision with a manifest, a version and a scan — not as a convenience.

---

## 4. Tool Search — the context-window fix

The problem, stated by the docs in one sentence: with many MCP servers or plugin tools attached, *"their
JSON schemas can consume a substantial fraction of the context window on every turn — even when only a few
of them are relevant."* (`tool-search.md:5–9`)

**Tool Search** is Hermes' **opt-in progressive-disclosure layer** for tools. When it activates, the MCP
and plugin tools are **replaced in the model-visible array by three bridge tools**:

```
tool_search(queries, limit?)   search the deferred-tool catalog
tool_describe(names)           load the full schemas for chosen tools
tool_call(calls)               invoke deferred tools
```

The model **searches for the tool it needs, loads that tool's schema, then calls it** — so an install with
hundreds of external tools pays almost nothing until a tool is wanted. **Hermes keeps its core working-set
tools eager by default** (`terminal`, `read_file`, `write_file`, `patch`, `search_files`, `todo`, `memory`,
`browser_*`, `web_search`, `web_extract`, `clarify`, `execute_code`, `delegate_task`, and the rest of
`_HERMES_CORE_TOOLS`) — **only cold, event-triggered tools are deferred.**

**This is the same idea as skill progressive disclosure (batch 03), applied to tools** — and it is the
mechanism that makes the owner's "nuggets as callable widgets" affordable: **many capabilities installed,
almost no standing context cost.**

### 4.1 A verification note (structure, not numbers)

`_HERMES_CORE_TOOLS` is real: `agent/memory_manager.py:471` and `:689` import it from `toolsets.py` and use
it to decide which tools stay eager. The three bridge tools are wired through the standard tool path, so a
deferred call gets **its own scope check, schema validation, hooks, approval and result** — *"each entry
gets its own scope check"* (`tool-search.md:41–44`). Deferral is a **context optimisation, not a security
bypass**.

---

## 5. The Nous Tool Gateway (a hosted convenience)

Separate from MCP: paid Nous Portal subscribers can use **web search, image generation, TTS and browser
automation through the Tool Gateway — no separate API keys** (`tool-gateway.md`). It is an enablement path
with an eligibility checklist and an FAQ; it does not change the tool model. **Named here** so it is
accounted for, and marked as a *vendor-convenience*, not a platform dependency.

---

## 6. The capability table — the owner's two questions

`Verdict` empty (that is Batch 12's job).

### 6.1 The tool system

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **Toolsets (core/composite/platform/dynamic)** | named bundles you switch on/off | the right powers, no more | a **per-tenant, per-role tool surface** | `now` |
| **Platform toolsets (hermes-acp, hermes-webhook…)** | a reduced tool surface per door | safer default surfaces | **built-in least privilege per entry point** | `now` |
| **Capability-gated + workflow-gated tools** | some tools appear only when configured / explicitly asked | no accidental danger | safety defaults a platform inherits | `now` |
| **Custom toolsets in config** | define your own named bundles | "our platform's tools" as one switch | packaged capability sets | `soon` |
| **278 tool modules, one registry** | a single place tools are registered | wide built-in reach | one integration point for our own tools | `now` |

### 6.2 MCP — the external-tool door

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **MCP (stdio + HTTP)** | plug in external tools without writing Hermes code | the AI reaches GitHub, a DB, an internal API | **the main integratability door** for a platform | `now` |
| **Auto-discovery → `mcp-<server>`** | a server's tools become a normal toolset | new tools appear by configuration | add capability without a deployment | `now` |
| **Catalog + manifest versioning + trust model** | vetted servers, one-click, versioned | safe, quick adoption | governance over what the AI can reach | `soon` |
| **Per-server filtering (whitelist/blacklist/glob)** | expose only chosen tools | control the blast radius | **least privilege per integration** | `now` |
| **Runtime `${ENV_VAR}` substitution** | credentials injected at runtime | keys stay out of config files | secret handling done right | `now` |
| **OAuth / mTLS / per-user identity header** | authenticated servers | the AI acts as *the right user* | **per-user identity** on external calls | `soon` |

### 6.3 Tool Search and the gateway

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **Tool Search (three bridge tools)** | load tool schemas on demand | many capabilities, fast chats | **many nuggets installed at ~no standing cost** | `soon` |
| **Eager core set (`_HERMES_CORE_TOOLS`)** | the everyday tools stay loaded | the common case stays fast | predictable core behaviour | `now` |
| **Deferral preserves scope checks/approvals** | deferred calls are still gated | no safety regression for a speed win | deferral is not a bypass | `now` |
| **Nous Tool Gateway** | hosted search/image/TTS/browser, no keys | fewer keys to manage | a convenience, **not** a dependency | `later` |

---

## 7. Divergence and boundary notes

- **No numeric divergence** in this batch; the toolset structure and the three bridge tools are stated
  consistently and the code modules exist as named (`tools/mcp_tool*.py`, `tools/registry.py`,
  `toolsets._HERMES_CORE_TOOLS`).
- **Boundary the docs state plainly:** Tool Search is **opt-in** and **JSON-schema-driven**. It buys
  context back; it does not change what a tool can do. The safety machinery (scope check, approval) is
  applied on the deferred path exactly as on the eager one.
- **`all`/`*` is not "everything".** Capability-gated and workflow-gated tools stay off. A platform must
  not assume `all` means *all*.

---

## 8. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C5-1 | Platform toolsets give a **ready-made reduced surface per door** — the platform's door should name one | batch 07 / synthesis |
| C5-2 | MCP is the main external-tool door; per-server filtering is the least-privilege lever | batch 08 |
| C5-3 | Tool Search makes many nuggets affordable — measure the defer flag behaviour | batch 07 / synthesis |
| C5-4 | `mcp-<server>` toolsets are **dynamic** — new tools without a Hermes change | synthesis |
| C5-5 | Deferred calls still get scope checks/approvals — confirm on the platform door | batch 08 |
| C5-6 | Runtime `${ENV_VAR}` substitution for MCP credentials — the secret pattern to copy | batch 08 |
| C5-7 | Custom toolsets = "our platform's tools" as a named bundle | synthesis |

---

## 9. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High and broad. A staff member's AI can **reach the systems they already use**
(GitHub, a database, an internal API) through MCP, **without anyone writing glue code** — and can be given
only the specific tools that role needs. Tool Search keeps a richly-equipped AI *fast*: hundreds of
abilities installed, none of them taxing the conversation until used.

**Q2 — VISION VALUE.** This is the **integratability** the owner named, and it is the strongest evidence
yet that the platform's "nuggets" concept has a **native seam**: a capability the platform wants callable
inside a workspace is, mechanically, a **tool** — registered in one place, grouped in a toolset, optionally
deferred behind Tool Search, and reachable over MCP if it lives outside Hermes. Three platform-grade
properties: **dynamic toolsets** (new capability by configuration, not deployment), **per-server
filtering** (least privilege per integration), and **platform toolsets** (a reduced surface per door).

**Learning lens.** Tools are the AI's **hands** — what it can *do* while learning. Tool Search matters to
the lens because it removes the cost penalty for a large capability set, which is what lets an AI (and the
skills it writes) grow without the chat getting slower and more expensive.

---

*Batch 05 of 12 complete. Divergences found this batch: 0. Next: `06-scheduling-delegation-and-kanban.md`.*
