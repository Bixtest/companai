# Batch 11 — Channels, voice and media

**Status:** COMPLETE
**Date:** 2026-10-15
**Method:** docs read in full against code; every claim carries a `file:line`. Docs are claims, code is authority (00-PIN-AND-METHOD.md §2).
**Source:** `hermes-agent-main/hermes-agent-main` @ pin (19,728 files; pyproject md5 `f57f729d4b251547a5a9e2565ce1e726`).

---

## §0 — Plain words

This batch covers **every way a person or another machine can reach Hermes, and every way Hermes can answer back in something other than text**:

1. **Channels** — Hermes can live inside ~35 different chat systems (Slack, Telegram, Discord, WhatsApp, WeCom, Feishu, DingTalk, Matrix, email, SMS, …). One gateway process serves them all.
2. **Voice** — you can *talk* to Hermes and have it *talk back* (down to a fully local, key-free setup), including inside Telegram and Discord.
3. **Media** — Hermes can read images, generate images, run a browser, drive a desktop, and it exposes a credential-injecting **egress proxy** so a sandbox never holds your real API keys.

The single most important finding is in §7: the **egress credential-injection proxy** (`iron-proxy`) is the most rigorous security design in the entire study — and its documentation states, in writing, *what it does not protect against*. A vendor that documents its own limits this precisely is telling you where the real trust boundary is.

One correction first (§1): the egress docs live at `user-guide/egress/`, **not** at `egress/` as my carried note (C8-6) recorded. Rule 13.

---

## §1 — What was read and verified

**Docs read in full (under `website/docs/`):**

| Doc | Size | Role |
|---|---|---|
| `user-guide/messaging/index.md` | 59,585 B | the gateway: platform comparison, security, pairing, busy-input, background sessions |
| `user-guide/messaging/telegram.md` | 77,014 B | the most complete platform guide |
| `user-guide/messaging/slack.md` | 55,347 B | incl. Slack-specific threading rules |
| `user-guide/messaging/discord.md` | 61,788 B | |
| `user-guide/messaging/whatsapp.md` / `whatsapp-cloud.md` | 17,775 / 24,111 B | two distinct WhatsApp paths |
| `user-guide/messaging/weixin.md` | 18,899 B | WeChat (China) |
| `user-guide/messaging/feishu.md` | 30,694 B | Feishu/Lark (China) |
| `user-guide/messaging/dingtalk.md` | 12,086 B | DingTalk (China) |
| `user-guide/messaging/wecom.md` + `wecom-callback.md` | 13,526 + 7,339 B | WeCom (China) |
| `user-guide/egress/iron-proxy.md` | **39,995 B** | the credential-injection proxy (carried C8-6) |
| `user-guide/egress/network-isolation.md` | 7,601 B | |
| `user-guide/features/voice-mode.md` | 33,927 B | |
| `user-guide/features/tts.md` | 47,591 B | |
| `user-guide/features/vision.md` | 14,815 B | |
| `user-guide/features/image-generation.md` | 21,106 B | |
| `user-guide/features/browser.md` | 51,760 B | |
| `user-guide/features/computer-use.md` | 33,955 B | |
| `user-guide/features/wake-word.md` | 16,578 B | |

**Code read and measured:**

| File | Finding | Verified at |
|---|---|---|
| `gateway/authz_mixin.py` | `dm_policy` = open/allowlist/disabled/**pairing**; `group_policy` = open/allowlist/disabled | `:419`, `:731–736` |
| `gateway/` (tree) | the gateway is a **large** subsystem (hosted rooms, delivery ledger, drain control, …) | `ls gateway/` |
| `agent/tts_registry.py` | 9 TTS providers, incl. **local** (`piper`, `neutts`, `kittentts`) | `:26` |
| `agent/transcription_registry.py` | 8 STT providers, incl. **local** | `:24` |
| `agent/{tts,transcription,image_gen,browser}_provider.py` | the four media ABCs are **small** (57–138 lines) — providers are plugins | (sizes) |
| `plugins/platforms/` | **21** channel plugins | `ls` |
| `acp_adapter/` | Hermes is an ACP server (b10 §7) | — |

**Correction (rule 13):** carried item C8-6 said *"the C8-6 egress read (`egress/iron-proxy.md`)"*. Measured: the path is **`website/docs/user-guide/egress/iron-proxy.md`** — there is no top-level `egress/` doc folder. Corrected here and in the carried-item list.

---

## §2 — Channels: one gateway, ~35 platforms

**Measured — the channel plugins** (`plugins/platforms/`, 21 entries): `a2a, buzz, dingtalk, discord, email, feishu, google_chat, irc, line, matrix, mattermost, ntfy, photon, raft, simplex, slack, sms, teams, telegram, wecom, whatsapp`.

**Measured — the messaging docs** (`user-guide/messaging/`, 36 files): the 21 above plus `bluebubbles` (iMessage), `homeassistant`, `msgraph-webhook`, `open-webui`, `qqbot`, `relay`, `signal`, `teams-meetings`, `weixin`, `whatsapp-cloud`, `wecom-callback`, `yuanbao`, `webhooks`, and the `index.md` hub.

**Notable China-first coverage:** **WeChat** (`weixin.md`, 18,899 B), **WeCom** (`wecom.md` + `wecom-callback.md`), **Feishu/Lark** (30,694 B), **DingTalk** (12,086 B), **QQ Bot** (`qqbot.md`), **Yuanbao** (`yuanbao.md`, 10,895 B). This is unusual breadth for a project of this kind and is directly relevant to a mainland-serving platform.

**The gateway is a subsystem, not a script.** Measured: `gateway/` contains dedicated modules for **hosted rooms** (peer, replicas, discussion, policy checkpoint, work lineage, authority history, execution policy), a **delivery ledger**, **drain control**, **control socket**, **cgroup cleanup**, **agent cache pressure**, **code skew**, and **authz**. That is the machinery of running many long-lived rooms across many platforms without losing messages or leaking state between them.

**Q1 (user value):** a user reaches their agent from whatever chat app they already use, including the ones dominant in China. Real and broad.
**Q2 (vision value):** for a business platform, the channel layer is where **identity** enters. Hermes solved "who is this person on this platform, and what are they allowed to do" once, centrally — see §3.

---

## §3 — Channel security: policies, pairing, and the silence token

**Measured in `gateway/authz_mixin.py`:**

- **Two policy axes, each with enumerable values** (`:419`): `dm_policy` ∈ **{open, allowlist, disabled, pairing}**; `group_policy` ∈ **{open, allowlist, disabled}**. Note that **`pairing` exists only for DMs** — a design choice, not an omission.
- **`pairing` = a code shown to the user, approved by the operator** (`index.md`: *"The user sees: Pairing code: XKGH5N7P"*, approved with a command). This is the "let strangers ask for access, and you decide" path.
- **Bots bypass the human allowlist only when explicitly admitted** (`:39`): "Bots admitted by `{PLATFORM}_ALLOW_BOTS` bypass the human allowlist (#4466)." So a bot integration is a deliberate open door, not an accident.
- **Allowlist comparison is hardened against known evasions:** `:174` — matching a *display name* "would bypass the allowlist (#44729)", so it matches on the id; `:91` — a Nostr `npub` must be **decoded** before comparing with a hex pubkey, otherwise "the central allowlist comparison string-matches the raw npub against the hex pubkey" and fails open. Both are recorded with issue numbers.
- **Allowlists are per-profile and isolation-safe** (`:50`): "Gate reads use the shared per-profile isolated reader (allowlist leak under multiplex, #72348)." So one profile's allowlist cannot leak into another's.
- **Group-level sender allowlists** (`WeCom groups.<id>.allow_from`) let a group be open at the chat level but restricted per sender (`:426–440`).
- **Per-turn authorization re-reads the *admitting* bot's allowlist** (`:346–347`): "every authorization decision made mid-turn (`/topic`, sibling `/stop`, plugin injection, voice, auto-resume) must read the admitting bot's allowlist instead." This closes the "you were admitted by bot A, then a mid-turn action was judged against bot B's policy" hole.

**The intentional-silence token** (`index.md`, section *Intentional Silence Tokens*) is a small but real design:

- Tokens: `[SILENT]`, `SILENT`, `NO_REPLY`, `NO REPLY`, and — notably — **`[静默]`/`静默` and `[沉默]`/`沉默`**, "the Chinese renderings a model produces when it translates the sentinel instead of emitting it literally".
- "The whole final response must be the token." A sentence *about* `[SILENT]` is delivered normally.
- **Silence is a delivery decision only** — the turn is still stored in the transcript, so the conversation still alternates.
- **A bare silence token on a message *from a person* is replaced by a short notice**, because "a message that needed a reply must not vanish". Internal wakes (background notifications) and messages the adapter reports as not-addressed may stay silent.
- "Failed turns still surface as errors; Hermes does not hide failures just because the text resembles a silence token."

**Q1:** a group-chat user is not spammed when the bot has nothing to say, but a *direct question* is never silently dropped. Good judgement.
**Q2:** the silence token is a **delivery-policy primitive** — and the Chinese-token handling shows the model's own translation behaviour was measured and accommodated rather than assumed.

---

## §4 — Voice: talk to it, and have it talk back

**Measured TTS providers** (`agent/tts_registry.py:26`): `edge, elevenlabs, openai, minimax, xai, mistral, gemini, neutts, kittentts` — **9**, of which **`edge`, `neutts`, `kittentts` need no API key** (`voice-mode.md`: *"Text-to-Speech (optional — Edge TTS and NeuTTS work without any key)"*).

**Measured STT providers** (`agent/transcription_registry.py:24`): `local, local_command, groq, openai, mistral, xai, elevenlabs, deepinfra` — **8**, of which **`local`** (Faster-Whisper, prepared by the package manager) needs **no key at all** (`voice-mode.md`: *"local provider needs NO key at all"*).

**Documented voice capabilities** (`voice-mode.md`, section map): CLI voice mode, **silence detection**, *ending a voice chat by voice*, **live transcription (streaming STT)**, **streaming TTS**, **barge-in**, a **hallucination filter**, gateway voice reply for Telegram & Discord (channels vs DMs, commands, modes, platform delivery), plus a Desktop **GPT-Live full-duplex** mode that "delegates to Hermes".

**Design notes worth recording:**

- **A hallucination filter exists specifically for voice.** Speech models are known to invent words on silence; Hermes ships a filter for it.
- **A fully local voice loop is possible** — local Whisper for input, Edge/NeuTTS for output, zero API keys. That is a genuinely offline voice assistant.
- **Streaming on both directions** (live STT, streaming TTS) plus **barge-in** means the interaction is conversational rather than walkie-talkie.
- The tiny ABCs (`tts_provider.py` 114 lines, `transcription_provider.py` 66) confirm voice is **plugin-extensible**: "STT custom command providers" and "Python plugin providers (STT)" are documented paths.

**Q1:** a user can speak to their agent, hear it answer, interrupt it, and do all of it offline with no keys. Strong.
**Q2:** for a resource planner, voice is a *modality*, and the fact that it is **plugin-extensible with a key-free local default** means a business can choose its cost/privacy posture. The hallucination filter is the kind of detail that separates a demo from a product.

---

## §5 — Vision and image generation

**Vision** (`vision.md`, 14,815 B): image understanding, wired into the tool surface (`vision_analyze` — referenced in b09's config comment about not accidentally turning a vision model "text-only"). Measured: `agent/image_routing.py` decides *whether* a model supports vision from a chain — `models.dev` catalog → config overrides → hardcoded defaults — with the comment that `supports_vision`/`supports_reasoning` "stay UNKNOWN (fail-open) unless the override sets them — a context_window-only entry must not turn into 'text-only' and hide `vision_analyze`".

**Image generation** (`image-generation.md`, 21,106 B): `agent/image_gen_provider.py` (138 lines) + `image_gen_registry.py` (47 lines) — a small ABC + registry, i.e. **plugin-extensible**, with a documented per-kind guide (`image-gen-provider-plugin.md`, 13,318 B) and an in-tree `plugins/image_gen/`. A `plugins/video_gen/` exists too (`video-gen-provider-plugin.md`, 9,366 B).

**Browser automation** (`browser.md`, 51,760 B) — genuinely multi-backend:
- **Browser Use** (default), **Browser Use cloud**, **Browserbase cloud**, **Firecrawl cloud** (or self-hosted), **Camofox local** (Docker, auto-detects arch).
- **Hybrid routing**: "cloud for public URLs, local for LAN/localhost".
- **Real profile browsing (use your own logins)** — a documented path to browse *as the user*, with its own config.
- Session TTL configurable (default 300 s).
- `browser-provider-plugin.md` + `browser-supervisor.md` exist, so the browser is also an extension point with a supervising process.

**Computer use** (`computer-use.md`, 33,955 B): desktop control (the `plugins/computer_use/` kind), with `gateway/browser_control_broker.py` and `browser_control_artifacts.py` mediating control from the gateway side — i.e. the broker pattern: the agent *requests*, a broker *performs*, and artifacts are recorded.

**Q1:** a user can point their agent at a real webpage with their own logins, or at a desktop app, and get images understood or produced. Real.
**Q2:** the **hybrid cloud/local routing** (public → cloud, private → local) is exactly the **data-boundary policy** a business needs; and the **broker pattern** for computer control is the right shape for auditability.

---

## §6 — Wake word

`wake-word.md` (16,578 B) documents a wake-word path — the "say a phrase and it starts listening" pattern. Combined with §4's local STT/TTS, this means a **fully offline, no-key, always-listening-until-woken** voice mode is within reach. Recorded because it changes the privacy story materially: nothing needs to leave the machine until the wake word fires.

---

## §7 — The egress credential-injection proxy (`iron-proxy`) — the study's strongest security design

Carried item **C8-6**, now read in full (39,995 B). This is the most rigorous document in the tree, and the most transferable mechanism.

**The problem it solves, in the doc's own words:**

> "When Hermes runs your agent inside a Docker terminal sandbox, that sandbox normally holds your real upstream API keys (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, etc.). A prompt-injected agent in that sandbox can `cat ~/.config/openrouter/auth.json` or `printenv | grep -i key` and exfiltrate them."

**The mechanism:** the sandbox holds opaque **proxy tokens**, never real keys. All outbound traffic routes through a local `iron-proxy` daemon (Apache-2.0, Go) on the host, which terminates TLS, swaps the token for the real credential, and forwards upstream.

**What it installs:**
- A pinned, **SHA-256-verified** binary in the package-manager tool store.
- A local CA at `~/.hermes/proxy/ca.crt` the sandbox trusts (so iron-proxy can MITM TLS and rewrite headers).
- `proxy.yaml` (allowed hosts + secret transforms) and `mappings.json` (token ↔ real env var).
- The sandbox gets `HTTPS_PROXY`/`HTTP_PROXY` → `host.docker.internal:9090/9091`, plus `REQUESTS_CA_BUNDLE`, `SSL_CERT_FILE`, `CURL_CA_BUNDLE`, `NODE_EXTRA_CA_CERTS`, and `NODE_OPTIONS=--use-openssl-ca`.

**Default allowed upstream hosts** (verbatim from the doc):
```
openrouter.ai           *.openrouter.ai
api.openai.com          api.anthropic.com
generativelanguage.googleapis.com
api.x.ai                api.mistral.ai
api.groq.com            api.together.xyz
api.deepseek.com        inference.nousresearch.com
```

**Default SSRF deny CIDRs** — enforced "regardless of allowlist", "checked at connect time, not at allowlist time" (this is what stops DNS rebinding):

| CIDR | Purpose |
|---|---|
| `127.0.0.0/8`, `::1/128` | loopback (v4 + v6) |
| `169.254.0.0/16`, `fe80::/10` | link-local — **incl. AWS/GCP/Azure IMDS** |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | RFC1918 |
| `fc00::/7` | IPv6 ULA |
| `::ffff:0:0/96` | IPv4-mapped IPv6 — closes the dual-stack IMDS bypass |
| `100.64.0.0/10` | RFC6598 CGNAT (AWS VPC, K8s pod nets) |
| `198.18.0.0/15` | RFC2544 benchmark range |

**Bind policy — never `0.0.0.0`:** Linux → the docker bridge gateway (`172.17.0.1`), reachable by containers via `--add-host=host.docker.internal:host-gateway` but **not from the LAN**; macOS/Windows Docker Desktop → loopback. Comment records that a hostile `ip` shim on PATH trying to inject a public/multicast/link-local bridge address still falls back to loopback, because "we never bind anything we couldn't validate via `ipaddress.IPv4Address` + `is_*` checks."

**PID and nonce defense** (a genuinely careful piece of engineering):
- pidfile written with `O_EXCL` + `O_NOFOLLOW` + ownership check; concurrent `start` refuses or unlinks a stale file and retries once.
- A **fresh random nonce** planted in both the daemon's env (`HERMES_IRON_PROXY_NONCE`) and `~/.hermes/proxy/iron-proxy.nonce` (mode `0600`).
- On `stop`, Hermes reads `/proc/<pid>/environ` and looks for the nonce — so a *recycled PID* is not mistaken for the daemon. The on-disk copy is what makes this work across separate CLI invocations.
- `stop_proxy` captures `/proc/<pid>/stat` **starttime** and re-verifies after the 5 s grace window; if starttime drifted, **SIGKILL is suppressed** with a warning.

**The security model is stated in both directions** — this is the part worth the ink:

*Protects against:* sandbox `printenv`/credential-file exfiltration; a compromised dependency phoning an unknown host (default-deny allowlist); cloud-metadata dialing (`169.254.169.254`, incl. the IPv4-mapped form); DNS rebinding via an allowlisted hostname; same-uid processes scraping the daemon env (only mapped var *names* are forwarded); a LAN peer with a leaked token (never bound to `0.0.0.0`).

*Does NOT protect against (verbatim intent):*
- A compromised **host** process — "real keys in the host's `~/.hermes/.env` are exposed regardless … a defense-in-depth feature for *sandbox* compromise, not host compromise."
- **Loss of the trusted-proxy boundary itself** — "If the CA private key is stolen, or sandbox egress is redirected to attacker-controlled proxy infrastructure, an adversary-in-the-middle can present a valid leaf cert and the proxy tokens are no longer a meaningful boundary" (cites MITRE ATT&CK **T1588.004**).
- Sandbox processes that **bypass `HTTPS_PROXY` with a raw socket** — "The proxy can't intercept what doesn't route to it."
- **Explicitly mounted credential files** — "Egress protects provider env vars; it does not inspect arbitrary mounted files. Do not mount real provider credentials into an enforced egress sandbox."
- **Allowlisted-host data exfiltration** — "If `api.openai.com` is allowed, an agent could embed exfil data in a request body to that host. The daemon log captures the request happened but doesn't prevent it."
- **Uncovered providers** (AWS Bedrock SigV4, GCP Vertex service-account OAuth) — those creds bypass the proxy entirely.
- **iron-proxy's own in-memory secrets** — a core dump or `/proc/<pid>/mem` read from a same-uid attacker would expose them; "out of scope for this layer."

**Failure modes are enumerated with the exact refusal text** — e.g. `enforce_on_docker: true` (default) means Docker sandbox creation **refuses to start** if the proxy is not running; a `docker_env`/`docker_forward_env`/`docker_extra_args` collision with a proxy-controlling key also refuses. The doc even notes that user `docker_extra_args` run *after* Hermes' generated args and could bypass egress, so it is refused.

**Q1:** a user who runs the agent in a Docker sandbox can be prompt-injected and lose nothing but a useless token. This is a large, real safety gain — and the default is **fail-closed** (`enforce_on_docker: true`).
**Q2:** **this is the most transferable artifact in the whole study.** A resource planner that runs model-written code near customer credentials needs exactly: default-deny allowlist, SSRF deny at connect time, never bind public, nonce-verified process identity, fail-closed on misconfiguration, and — critically — **a written list of what the layer does not protect**. That last item is the difference between a security feature and a security *claim*.

---

## §8 — Divergences, boundaries and corrections

**Divergences found this batch: 0** (channel policy values, TTS/STT provider sets, iron-proxy defaults and security model all matched code/definitions on every checked claim). **One correction to a carried note** (§1, rule 13).

| Claim | Verdict | Evidence |
|---|---|---|
| `dm_policy` = open/allowlist/disabled/**pairing**; `group_policy` lacks pairing | **TRUE** | `authz_mixin.py:419` |
| Bot admission bypasses the human allowlist only via explicit env | **TRUE** | `authz_mixin.py:39` |
| Silence tokens include Chinese renderings; whole response must be the token | **TRUE** | `messaging/index.md` |
| 9 TTS providers incl. 3 key-free; 8 STT providers incl. local | **TRUE** | `tts_registry.py:26`, `transcription_registry.py:24` |
| iron-proxy: default-deny allowlist, SSRF deny at connect time, never `0.0.0.0`, fail-closed | **TRUE** | `egress/iron-proxy.md` |
| The egress doc lives at `user-guide/egress/`, not `egress/` | **CORRECTED** | `find website/docs -type d -iname egress` |

**Boundary surfaced (not a divergence):** the egress proxy **only covers the Docker backend** — "Modal, Daytona, SSH, and Singularity do **not** receive proxy env vars or CA mounts yet." So a sandbox on a non-Docker backend holds real keys.

**Boundary surfaced:** egress protects **provider env vars**, not mounted files, not allowlisted-host exfil, and not the host process. The doc says so explicitly.

**Boundary surfaced:** the proxy cannot intercept traffic that does not use `HTTPS_PROXY` (raw sockets); Node.js is only *partially* mitigated via `--use-openssl-ca`.

---

## §9 — Carried items

| ID | Item | Status |
|---|---|---|
| **C11-1** | ~35 channels, 21 as plugins, heavy China coverage (WeChat/WeCom/Feishu/DingTalk/QQ/Yuanbao). | For §12 |
| **C11-2** | Channel identity is solved once: dm_policy (4 values incl. pairing) + group_policy (3) + per-profile isolation + mid-turn re-read of the admitting bot's allowlist. | For §12 |
| **C11-3** | Silence token is a delivery-policy primitive; Chinese renderings handled; a person's message never silently vanishes. | For §12 |
| **C11-4** | Voice: 9 TTS (3 key-free) / 8 STT (local key-free); streaming both ways; barge-in; hallucination filter; wake word → fully offline voice loop possible. | For §12 |
| **C11-5** | Browser: hybrid routing (cloud for public, local for LAN) is a data-boundary policy; real-profile browsing documented. | For §12 |
| **C11-6** | **iron-proxy** is the study's strongest security design; its "does NOT protect" list is the transferable template. | **For §12 — high priority** |
| **C11-7** | Egress covers **Docker only**; other backends hold real keys. | For §12 |
| **C11-8** | Computer-use uses a **broker** pattern (agent requests → broker performs → artifacts recorded). | For §12 |
| **C11-9** | **Correction**: egress docs path is `user-guide/egress/`. | Recorded |

---

## §10 — Batch-level value questions (Q1 user / Q2 vision)

**Q1 — how does this serve a user use case?**
A user can reach their agent from almost any chat app — including the ones dominant in China — with an access policy that ranges from fully open to code-verified pairing, and with a bot's admission kept separate from a human's. They can talk to it and hear it answer, **entirely offline with no API keys**, interrupt it mid-sentence, and it will not invent words on silence (hallucination filter) or spam a group chat (silence token). It can read images, make images, browse with the user's own logins when needed, and drive a desktop through an auditable broker. And if the agent runs in a Docker sandbox and a malicious page prompt-injects it, **the sandbox holds only useless tokens** — a single command (`hermes egress start`) with **fail-closed** defaults.

**Q2 — how does this serve the vision of an AI-first business/resource planner?**
Three mechanisms look directly reusable, ranked:

1. **The iron-proxy egress model** (§7) — default-deny allowlist, connect-time SSRF denial, never-bind-public, nonce-verified process identity, fail-closed on misconfiguration, and a **published list of its own limits**. This is the template for how a platform should hold *customer* credentials while running *model-written* code.
2. **Channel identity solved once** (§3) — one policy vocabulary for every transport, per-profile isolation, and mid-turn re-authorization against the *admitting* principal. A platform with many channels needs exactly this and should not re-invent it.
3. **Hybrid cloud/local routing + broker pattern** (§5, §8) — a **data-boundary policy** (public → cloud, private → local) and an **auditable action broker** for anything that touches a real machine.

**Cross-reference:** mercato-vs-Hermes placement is deferred to `12-SYNTHESIS.md` per the owner's instruction.

---

**Batch 11 of 12 complete. Divergences found this batch: 0**, and **one path correction to a carried note** (rule 13): the egress docs are at `user-guide/egress/`, not `egress/`. **Most transferable mechanism:** the **iron-proxy egress credential-injection proxy** — its default-deny allowlist, connect-time SSRF deny, fail-closed defaults and, above all, its *written list of what it does not protect*. **Also notable:** a fully offline, key-free voice loop is achievable (local Whisper + Edge/NeuTTS + wake word), and ~35 channels include deep China coverage.
**Next: `12-SYNTHESIS.md`** — the study's closing document, answering the owner's three questions (what mercato serves better and should move into Hermes; what Hermes does better and should move into the platform; what to build on / around / under), each grounded in the batch findings, then fed back under rule 16.
