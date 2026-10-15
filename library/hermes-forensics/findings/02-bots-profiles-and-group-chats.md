# Batch 02 — Bots, profiles and group chats

**Status:** DONE — 2026-10-15 · **Source:** the pinned tree (`00-PIN-AND-METHOD.md` §1)
**Method:** doc claims checked against the Python source; code wins; divergences recorded.

---

## 0. What this batch is (plain words)

The previous batch described *one* agent. This batch describes **many**: how Hermes runs several agents
side by side, gives each its own identity, memory and credentials, and lets them **talk to each other** —
including in shared group rooms. In the owner's frame this is the **DP-09 match**: AI persons that human
staff address by name.

Four words are used precisely here, and the docs define them (`user-guide/profiles.md:19–43`):

- **Profile** — a separate Hermes home directory: its own config, keys, memory, sessions, skills, cron.
- **Agent** — the running assistant that uses a profile.
- **Bot (Bot Mode)** — a profile *presented* as a named entry in a roster, with an avatar and one
  permanent chat. **Every Bot is a profile; not every profile is a Bot.**
- **Subagent** — a child spawned by `delegate_task` for one task, with a fresh conversation. *"A separate
  conversation is different from a separate profile."*

---

## 1. What was read, and how big it is (measured)

| Doc (under `website/docs/`) | Bytes |
|---|---:|
| `user-guide/multi-profile-gateways.md` | 77,212 |
| `user-guide/bot-mode.md` | 53,509 |
| `user-guide/profile-distributions.md` | 34,293 |
| `user-guide/profiles.md` | 25,661 |
| **Total** | **190,675** |

| Code verified against | Evidence |
|---|---|
| `get_hermes_home()` path resolution | **821 Python files** reference it (grep count) |
| `tools/bot_mode_dm.py` | `message_agent_tool` (line 201), auto-attribution (line 243) |
| `hermes_cli/profile_cmd.py`, `profile_channels.py` | profile list/rename/channel-strip logic |

---

## 2. Profiles — the isolation unit, in plain words

A profile is **just a directory** under `~/.hermes/profiles/<name>/`, holding its own `config.yaml`,
`.env`, `SOUL.md`, memories, sessions, skills and state database. Hermes recognises a directory as a
profile **only if it carries an identity file** (`config.yaml`, `.env`, `SOUL.md`, `profile.yaml`,
`auth.json`, `state.db`); a stray directory left by logging is ignored.

**How the isolation actually works** (verified): every path resolution goes through the `HERMES_HOME`
environment variable via `get_hermes_home()`. The docs claim *"119+ files in the codebase resolve paths
via `get_hermes_home()`"* (`profiles.md:403`). **DIVERGENCE (docs understate):** a grep counts **821
Python files** referencing it. The isolation is broader than the docs say — which is the *safe* direction
for a divergence to point.

### 2.1 The hard rule the docs state, worth repeating

> *"Never point two agent processes at the same profile… Both write memory automatically, and each loads
> the other's writes into its system prompt at session start — so two writers on one home compound each
> other's state until it stops being anything you configured."* (`profiles.md:13–15`)

**This is the exact hazard of running several agents on one home.** It is the reason a per-tenant agent
needs its **own** home, and it is a direct constraint on any shared-agent design.

### 2.2 Profiles are NOT a security sandbox — stated by the docs themselves

> *"Profiles do **not** sandbox the agent… On the default `local` terminal backend, the agent still has
> the same filesystem access as your user account."* (`profiles.md:234–236`)

**Named, and important:** a profile separates *state* (config, memory, sessions), **not** filesystem
reach. Real isolation needs a terminal backend (`docker`/`ssh`), which is batch 08/11 material. This is a
boundary a platform must not confuse.

### 2.3 What travels and what does not, on a clone

| Clone flag | Copies | Leaves behind |
|---|---|---|
| `--clone` | config, `.env`, `SOUL.md`, skills, `memories/MEMORY.md` + `USER.md` | sessions, `state.db`, cron |
| `--clone-all` | everything incl. all memories, plugins | per-profile history (can be tens of GB), **cron jobs** (would run twice) |
| `--clone-channels` | (opt-in) the source's bot tokens/allowlists | — (off by default; two gateways on one token fight over the long-poll) |

**Verified detail:** OAuth logins are **not copied** — they carry single-use refresh tokens, so a copy is
the *same credential with two owners* and the first refresh revokes it for all copies (`profiles.md:104`).

---

## 3. Bot Mode — profiles as named persons

Bot Mode is a **desktop UI over the profile primitive** — the docs are explicit that there is *"no new
primitive"*, no core patch, no daemon (`bot-mode.md:12–13`). What it adds on top of a plain profile:

| Plain profile | Bot Mode |
|---|---|
| many sessions; you pick one | **one permanent "Bot Chat"** per Bot; `/new` is rerouted to `/compact` to protect it |
| switch profiles to reach a specialist | every Bot in **one roster** with avatar, last message, unread |
| profiles never talk | Bots **message each other** and share **group rooms** |
| cron jobs live apart in `hermes cron` | each Bot's **routines** are edited beside its chat |

Each Bot can carry: its **own model pin**, its own `SOUL.md`, per-skill / per-toolset / per-MCP-server
enablement, and **its own credential store** (static keys copied; OAuth not — signed in per Bot).

**Avatars** are notable for a platform UI: deterministic "blob faces" derived from the name, geometric
faces with a *live "thinking" animation* owned by the busy Bot, uploaded images, AI-generated portraits,
or a pixel pet. That is a ready-made **visual identity layer for AI persons**.

### 3.1 VERIFIED IN CODE — `message_agent` is real, with auto-attribution

`tools/bot_mode_dm.py` defines `message_agent_tool` (line 201); the docstring (line 5) matches the doc:
*"target is validated against the live roster, the attribution prefix is applied automatically"*. Line 243
builds the literal prefix: `"Message from 🤖 {name} (@{handle}): "`. **Doc claim: TRUE.**

**The mechanism in plain words:** when a Bot messages a teammate, **your text is never forwarded verbatim**
— the target Bot composes its own message and replies attributed. The same command carries an
**idempotency / delivery-id** contract (`status: queued` + `delivery_id` means *handed to the delivery
process*, not *delivered*) so a send is not silently repeated.

### 3.2 A code-level gate the docs explain plainly — worth keeping

The docs are unusually explicit that `message_agent` requires **two markers** beyond the master switch:
the session must be titled exactly `Bot Chat`, **and** some profile on the install must carry a
`ui_meta: {hermes-bots: …}` block (`bot-mode.md:198–205`). **Consequence they state out loud:** on a
*headless* install (gateway + Telegram, no desktop) nothing writes those markers, so **`message_agent` is
unreachable** even with the switch on. They give the two manual commands to satisfy both.

**Why this belongs in the record:** it is a documented case where a feature is **UI-reachable only**, and
the docs give the headless workaround. That is the pattern a platform must plan for when it drives Hermes
without a desktop.

---

## 4. Group chats — several agents in one room, in plain words

A group room seats **2–6 Bots** and one visible conversation. A human message triggers **up to three
serial rounds** of member turns; **@-mentioned Bots respond** (everyone responds when nobody is mentioned);
**each Bot decides whether to speak** — a member replies only if it has something new, and otherwise
*passes*. Hard caps (**10 messages per send, 3 rounds**) stop a room spinning. A member escalates a real
judgement call to the human with `@user`, which lights a **"needs you"** badge.

Each member keeps its **own persistent room session** — so room context survives like any conversation —
and each turn carries the room history since that member's last turn, **capped at ~200 messages or 32,000
characters**, with a single oversized message cut to an 8,000-character excerpt.

**Rooms are durable and portable:** room transcript, members, picture and name are mirrored into the
shared profile metadata of **every** gateway the desktop is connected to, with per-gateway versioning so
two desktops merge instead of overwriting. **Rooms keep running when the desktop closes** — when all
members live on one gateway, that gateway drives the turns; the desktop catches up from the room log.
Room state lives in the install's root `shared-state.db`.

**Rooms can span machines** — a member on this device plus one on another gateway is enough. Each
member's turns run on its own machine; a **device badge** and a device-qualified `@name-device` handle
keep same-named agents apart.

**Plugins can watch the room** via the `on_room_member_activity` hook with room/member/turn coordinates
(`bot-mode.md:175`) — i.e. **an outside system can render live "who is doing what" UI** without reading
Hermes internals. That is directly relevant to a platform front-end.

### 4.1 Cross-machine messaging without a desktop — `hermes peer`

Bots on one machine can reach Bots on another machine's gateway with **no desktop in the loop**: register
the other gateway as a *peer* (API-server URL + key), then `hermes peer dm` / `peer run` / `peer status` /
`peer stop`. A stable `--idempotency-key` makes a retry return the original run instead of duplicating
work. **A documented limit:** reachability is one-way across NAT — a gateway behind home NAT can dial out
but cannot be dialled into (use Tailscale/VPN or put authority on the reachable host).

---

## 5. The capability table — the owner's two questions

`Verdict` empty (that is Batch 12's job).

### 5.1 Isolation and identity

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **Profile = one home per agent** | each agent has its own config, memory, keys, skills | a staff member's assistant remembers *their* work, not a neighbour's | the per-tenant / per-employee boundary the platform needs | `now` |
| **The one-writer rule** | two processes on one home corrupt each other's memory | (a correctness rule, not a feature) | a **hard constraint**: a per-tenant agent must own its home | `now` |
| **Profiles are not a sandbox** | state is separated; **filesystem reach is not** | — | names exactly where real isolation must be added (batch 08) | `now` |
| Per-Bot model pin | each Bot runs its own model | a fast cheap Bot for chores, a strong one for analysis | per-agent cost shaping | `soon` |
| Per-Bot credentials | each Bot its own keys | — | per-tenant key ownership (the owner's "I add my keys") | `soon` |

### 5.2 AI persons as workers

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **Bot = named person with avatar** | AI colleagues with a face, a title, a permanent chat | staff address an AI by name, not a tool | **the DP-09 shape**: AI persons like human staff | `now` |
| **Bot Chat (forever-conversation)** | one continuous thread per AI person | "my conversation with the analyst" never resets | the durable relationship a workspace thread models | `now` |
| **Routines per Bot** | each Bot's scheduled work lives with it | "my analyst reports every morning" | automated staff functions | `soon` |
| **Bot-to-bot `message_agent`** | agents message each other, attributed | an agent can hand work to a specialist without the human relaying it | an **AI org** that coordinates itself | `soon` |
| Capability scoping per Bot | tick exactly the skills/tools/MCP a Bot may use | a focused assistant, fewer surprises | least privilege per AI person | `soon` |

### 5.3 Rooms and multi-agent work

| Capability | What it is (plain) | Q1 · user value | Q2 · vision value | Phase |
|---|---|---|---|---|
| **Group chats (2–6 Bots)** | several agents in one visible room | a team of AI specialists discusses a problem; the human watches and steps in | the **workspace thread** the owner described, already real | `soon` |
| **@mention routing / `@user` escalation** | address one agent; escalate to the human | precise control; the AI asks when it should | human-in-the-loop by design | `soon` |
| **Bots decide to speak or pass** | no agent floods the room | a readable room, not noise | quality control on multi-agent output | `soon` |
| **Durable rooms (survive desktop close)** | rooms run on the gateway | work continues when the human leaves | unattended multi-agent work | `later` |
| **Cross-machine rooms + `hermes peer`** | agents on different machines, one room | a distributed team of agents | horizontal scale of the AI org | `long-run` |
| **Room activity hook for plugins** | outside systems can watch members work | live "who is doing what" UI | a platform front-end can render the room **without forking Hermes** | `soon` |
| **Headless limitation** | `message_agent` needs UI-written markers | — | a documented gotcha: a driven-without-desktop setup must satisfy two markers by hand | `now` |

---

## 6. Items carried forward

| # | Item | Goes to |
|---|---|---|
| C2-1 | The one-writer rule — a per-tenant agent must own its home; measure what "own" requires | batch 07 / synthesis |
| C2-2 | Profiles isolate state, not filesystem — measure the real sandbox options | batch 08 |
| C2-3 | Bot Chat is a forever-thread — direct model for the platform's workspace thread | synthesis |
| C2-4 | `message_agent` attribution + delivery-id contract — the shape for AI-to-AI handoff | batch 06 |
| C2-5 | Group-room 2–6 / 3-rounds / pass-or-speak rules — measure the actual constants in code | batch 06 |
| C2-6 | `on_room_member_activity` hook — the seam for a platform front-end to render rooms | batch 07 |
| C2-7 | `hermes peer` + idempotency keys — the cross-machine pattern | batch 08 |
| C2-8 | The headless marker gotcha — what a platform must do to enable agent-to-agent without a desktop | batch 07 |

---

## 7. The two value questions, answered at the batch level

**Q1 — USER VALUE.** High, and it goes to the heart of the owner's DP-09. A staff member gets **named AI
colleagues** with a face and a permanent conversation, whom they address with `@`, who can be given
capabilities, who run their own routines, and who **hand work to each other** — the human does not relay
between agents. Groups let several specialists work a problem in one room the human can watch, with a
"needs you" badge when one escalates. This is a working answer to "AI persons, called by `@`, like human
staff."

**Q2 — VISION VALUE.** Load-bearing, and it comes with two hard constraints the docs state:
(a) **one profile must have one writer** (shared homes corrupt memory), and (b) **a profile is not a
sandbox** (state is separated, filesystem is not). Both are honest boundaries the platform must build
inside, not around. The upside: rooms are **durable, portable and plugin-observable**, and cross-machine
`peer` links let an AI org scale beyond one box. **Versatility (many agents, many models) and
integratability (a room-activity hook, a delivery-id contract) are present already.**

**Learning lens.** Each Bot has **its own memory and skills** (`profiles.md:11`), so learning is
per-person by construction — a specialist Bot deepens in its own domain. The room is where those separate
learnings meet; the `on_room_member_activity` hook is what would let the platform *see* that happening.

---

*Batch 02 of 12 complete. Divergences found this batch: 1 (the `get_hermes_home()` count — docs say
119+, code shows 821). Next: `03-skills-and-the-learning-loop.md`.*
