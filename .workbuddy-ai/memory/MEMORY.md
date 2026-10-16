# Project memory — Companai / open-mercato

> Detail → daily logs + `JOURNAL.md`. New work: HERE + today's log.

## ★ ARCHITECTURE WORKSHOP — `library/architecture/`
**Method (binding):** study platforms ONE AT A TIME; find what fits the **three poles** (P1
aissistant · P2 workspace · P3 automations) + widgets/frontend (PX-W/PX-F) + escape hatch (PZ);
**then map each pole across ALL platforms vs mercato → a clean SRS; then build one-tenant ↔
one-Hermes.** **No development before a written requirement. Hermes is NOT forked or edited.
Markdown is the source of truth — never edited to fit a reader.** Readers: copy + rebrand,
never rewrite.
**★ THE MAPPING FRAME (owner, 2026-10-16): we are NOT limited by what mercato allows.** For
each pole, engineer the **best, richest, most versatile, most integratable** version — plus
every extra feature/plugin/module/idea the nine platforms inspire — then re-engineer
accordingly. HAVE/BUILD/BORROW stays as the ledger; the ceiling is the target design, not
mercato's current state. → `library/architecture/mapping/` (00-PIN-AND-METHOD + findings/01..08).

**Rule 1: docs are claims, code is the authority.** **Rule 13: a committed number can be wrong —
re-measure, commit the fix *by name*.**

## ★ STANDING FORMAT — every pass reports (owner's instruction 2026-10-16: *"I dont want to keep repeating this - this is a must do"*)
Every turn MUST state: **(1) exactly what was done, (2) its address in `MASTER-CHECKLIST.html`** (the
`CC-nn` code / row number), **(3) what will be worked on next** — and **the top of the HTML section must
be updated accordingly**: that is the `FRONTIER` array at the top of its `<script>` (the "▶ The frontier"
card), which carries **LAST DONE** (with the `CC-*` addresses) and **▶ NEXT**. The `.md` twin's §2 mirrors
it. Syntax-check a script edit by extracting `<script>` and running `node --check`.

## Platform studies — verdicts (logs + `findings/`)
1. **Hermes** ✅ 13/13 — main AI engine. "OpenCode" = a provider, not an agent.
2. **Paperclip 0.3.1** ✅ 7/7 — P2/P3 strength; P1 = seam-provider.
3. **CrewAI 1.15.28** ✅ 7/7 — **mechanism donor, not a template.**
4. **Multica 0.2.0** ✅ 7/7 — **all three poles real; closest neighbour.**
5. **Gas Town 1.2.1** ✅ 7/7 — watchdog chain of agents; Hook = durability.
6. **n8n 2.44.0** ✅ 7/7 — **PX-W = first real composition surface.**
7. **buzz 0.5.28** ✅ 7/7 — **community = tenant** (Nostr); **PZ = strongest.**
8. **openrig 0.6.10** ✅ 7/7 — **no tenancy at all**; PZ = gate culture.
9. **zulip 12.0-dev** ✅ 7/7 — **★ P2 = STRONGEST: the ambient realm** (tenant = request's Host
   header); **★ PX-W = first real widget model**; **★ PZ = densest guards.**
— **mattermost** ⬜ **ASK before extracting** (226 MB zip on disk; activepieces 106 MB unlisted).
**Widget model: only n8n + zulip.**

**★ STUDY CHAIN: 9 CLOSED, readers built. MAPPING PASS = RUNNING** (`mapping/findings/01..08`,
requirements `SR-01…SR-nn`). mattermost joins later as a **10th column** (no rework).

## Standing hazards
- **Line endings:** repo commits **CRLF as-is**; CR count == line count is NORMAL — do not "fix"
  it. No BOM, ever.
- **Git-Bash `grep -c $'\r'` LIES**; byte truth = `tr -cd '\r' < f | wc -c`; verify the **staged
  blob** (`git show :path`). Python `open(p,'w')` flips LF→CRLF — pass `newline=''`.
- **Never `git add -A`** — explicit paths. Docs repo = `C:/Users/Ramzi/Downloads/companai`.
- **A numbering ceiling is not a count** (zulip: "0001–0812" = 789 files); a substring skip for
  `.git` drops `.github/`.
- `tsc` needs `--incremental false`; jest does NOT type-check; node→node spawn = `EBUSY`.
- **`library/development/MASTER-CHECKLIST.html` is DATA-DRIVEN, not generated.** Its content lives in the
  JS arrays at the top of its `<script>` (`PHASES`, `ROWS`, `OPEN`, `PLATFORMS`, `FRONTIER`, `REGISTER`,
  `SRSREG`) — **edit an array entry, never the rendered markup** — and every count derives from those
  arrays at render time, so they cannot drift. `REGISTER` rows are `["CC-nn","text","closed|open"]`.
  It is **hand-synced** with the `.md` twin, not rebuilt from it, so the two DO drift (it was missing
  `CC-85`…`CC-89` until 2026-10-16). Syntax-check a script edit by extracting `<script>` and running
  `node --check`.

## ★ LOCAL STACK — the two fixes applied 2026-10-16 (owner-approved, nothing trimmed)
**Symptom:** the first turn of a chat cost **~2,264 s (~38 min)**. Cause = a **cold-process prompt-cache
miss**, NOT prompt length. Nothing sleeps (`restart: unless-stopped`); the cache lives in **model RAM**.
**Fix 1 — `.wslconfig` `processors` 4 → 8.** The VM capped 4 CPUs while the model is tuned for 8
(`-t 4 -tb 8`) → `-tb 8` clamped. **★ MEASURED — and the real gain is SMALLER than the early sample
suggested.** The cold prefill rate is **length-dependent**, so an early-fill sample flatters: at the
SAME 2,048-token progress point, 8 CPUs took **168.08 s vs 262.12 s** (7.81 → **12.18 tok/s, +56 %**),
but the WHOLE 16,560-token cold fill measured **2,051 s at 8.07 tok/s** vs the historical **2,264 s at
7.32 tok/s — only +10 %**. The whole-fill figure is what a first turn actually pays; the +56 % is a
2,048-token *instantaneous* rate, not the fill. (Length-dependence confirmed independently: 12.26 tok/s
on 1,148 tokens vs 7.32 on 16,572.) Model at **830 % CPU**, `nproc` 8. **★ CORRECTION OF MY OWN FIRST
READING:** I first reported "~7 %" by comparing 7.81 tok/s against the historical 7.32 — **both of which
are 4-CPU numbers**, the 7.81 sample having been taken *before* the VM restart. **Timestamp every
measurement and prove which run it belongs to before subtracting — and compare WHOLE jobs, not
segments.** The model's `n_threads = 4` startup line is a red herring: that is the `-t 4`
**generation** pool, not the `-tb 8` **batch** pool.
**⚠️ IT DOES NOT APPLY ON A DOCKER RESTART.** A Docker Desktop restart restarts the **daemon and
containers, NOT the WSL2 VM**, and `.wslconfig` is read only at VM boot. Proof: `/proc/uptime` in a
container (= the VM's uptime, it is not namespaced) was **16.9 h** after the restart, and the model log
still said `n_threads = 4`. Docker Desktop's own `settings-store.json` has **no CPU keys**, so nothing
overrides the file. **★ WHAT DOES APPLY IT: `docker desktop stop` then `docker desktop start`** —
verified, `NCPU` 4 → 8, VM uptime reset to 60 s. (`wsl --shutdown` also works, but `wsl.exe` is on the
sandbox **program blacklist** and that block cannot be lifted by approval — the owner would have to
remove it in Security Center → Command Security → Program Blacklist. Use the `docker desktop` CLI.)
**Fix 2 — the warm-up** (`workspace/starting-kit/docker/hermes/warmup.py` + the `hermes-warmup` service in
`docker-compose.hermes.yml`). **Replay, never rebuild:** the worker's own `state.db` already stores BOTH
halves of the exact prefix — `sessions.system_prompt_hash` → system text (**26,549 ch**) and
`sessions.tool_names` → the tools array in **literal OpenAI wire JSON** (**42,619 ch**; 26,549+42,619 =
**69,168 = the measured total**). POST them unchanged to `/v1/chat/completions` with `max_tokens: 1`.
**MEASURED: 16,559 of 16,560 tokens reused in 1.4–4.1 s** (vs **2,051 s** for the whole cold fill —
≈500×). Loops every 600 s, self-heals with no restart detection; SKIP retries in 30 s. **★ COLD FILL NOW
SEEN LIVE (2026-10-16):** after the VM restart the loop engaged by itself (`warming from session
20261016_100451_37afd4`), prefilled all 16,560 tokens in **2,051 s**, and the next probe read
`already WARM (16,559 of 16,560)`. **Gotcha:** `usage…cached_tokens` reports the cache state as the
request STARTED, so a cold cycle legitimately logs `0` even though it just filled the cache — judge a
fill from the NEXT cycle, not its own counter. Likewise `/slots n_prompt_tokens` **during** processing
is a progress value, not the total (it read 14,336 mid-fill while `usage.prompt_tokens` said 16,560).
**Docker CPU% ABOVE NCPU×100 % is a stats artifact, not a runaway.** Docker Desktop showing
`856 % / 800 %` (or `901 %`) is normal: the percentage is a *ratio sampled over a short window* — the
container's usage delta and the system's total jiffies delta are not read at the same instant — so it
overshoots the theoretical cap. **Judge load with `/proc/loadavg` instead.** During the warm-up's cold
fill it reads **~8.3 on 8 CPUs**, which is exactly the 8 batch threads (`-tb 8`) running: the clean
confirmation the CPU change took effect (it would read ~4 before). Also note `cpu.max` = `max 100000`
in the model container — **no CPU quota**, so it legitimately uses every CPU the VM has.
**Gotchas:** llama.cpp control endpoints (`/props`, `/slots`) are at the **ROOT**, not under `/v1`
(L171); the state volume is mounted **rw on purpose** — the script only ever SELECTs, and note the worker
runs `journal_mode=DELETE`, **NOT** WAL, so the old "SQLite needs the WAL `-shm`" justification does not
describe it (corrected 2026-10-16); `workspace/starting-kit/`
is **gitignored** (`.gitignore:15`) so deployment changes are local-only — the record lives in `JOURNAL.md`.
**Architecture:** the containers **already run in Linux** (`Kernel=…-microsoft-standard-WSL2`; a container's
`/etc/os-release` = **Ubuntu 24.04.5 LTS**). Docker Desktop is only a front end. **Ruling: keep Desktop for
dev velocity; migrate to the `Platform-Server` VM (Ubuntu 24.04.5 + Coolify) when integration testing
against the deployment target begins — not now.**

## Live code frontier (`JOURNAL.md`)
**★ NEXT = the rest of the TOOLING SET (`CC-91`)** — `SR-38` (digital-twin harness) and the
**re-homed** `SR-46` (two-reads lint). **★ WHY IT IS NEXT, NOT THE SWITCHOVER:** the
SRS's own sequencing is `SR-38/39/41/46` (tooling) → `SR-02`+`SR-07` (identity) → **`SR-12` (per-tenant
engine home = the fix for the open `CC-84`)** → and **`SR-12` GATES `P2-9b`**. Flipping the default
*before* `SR-12` would make `CC-84`'s hole the **default** path. The tooling set is the SRS's *"land
FIRST; make everything after cheaper"* block. **★ TWO SLICES DONE (2026-10-16 evening):**
**(1) `SR-39` (one-truth) = `scripts/check-one-truth.mjs`** — registry-driven, **4/4 incl. a mutation
proof**, `check:one-truth` in `package.json`, first fact = the **Hermes pin digest** (the fact that
actually drifted, `CC-90`); **PASSES against the real repo** (all three copies at `07ee857b…`).
**(2) `SR-41` (named escape hatches) = `scripts/check-escape-hatches.mjs`** — **5/5**, `check:escape-hatches`
/ `:fail`; **measured the real repo: 7,968 files · 202 holes · 33 named · 169 unnamed**, and the gap is
**ONE-SIDED** — every `@ts-expect-error`/`@ts-ignore` is named (**24/24**) but only **8 of 168**
`eslint-disable`s are, so it is a *convention gap*, not a discipline failure. **★ FINDING:** the SRS
marks all four BORROW, but the repo **already runs the pattern** (`check-version-alignment.sh`
= one-truth; `check-agents-md-budget.mjs` + `.baseline.json` = the ratchet `SR-40`) — so the work is
*generalise*, not *import*. **★ `SR-46`'s STATED HOME IS WRONG:** `packages/eslint-plugin-ds` runs only
on **backend-UI files** (`eslint.ds.config.mjs` scopes it to `**/backend/**`), so a *settings-read* lint
there would never fire on the files that read settings (`process.env` read **718×** in `src`) — it
belongs in the `scripts/check-*.mjs` family, where cross-file drift is visible. **★ BLOCKER for more
`SR-39` registrations:** `HERMES-PIN.md` carries **TWO different 32-hex digests for the same tree**
(`f57f729d…` §1 vs `07ee857b…` note) → not registered until it agrees with itself. Plan:
`library/development/PLAN-tooling-set-SR-38-39-41-46.md`.
**`P2-9b` — now SPLIT (owner's ruling 2026-10-16, Q3):** **(1)** the default-flip to Hermes + the
`hermes-local` retirement (`CC-74`) — **after `SR-12` lands**; **(2)** the **OpenCode deletion**
(`R28-6`/`N-8`) — **DEFERRED**: OpenCode stays in place, un-defaulted, so deleting it cannot break
something we are unaware of; revisit once its presence has proved harmless.
**Its stale-timeout gate is CLOSED (Option 1):** keep the 2400 s ceiling; on-demand tool loading is
standard (the pin ships progressive disclosure ON by default; prompt-cache reuse measured ON).
**★ MEASUREMENT LEG DONE (2026-10-16 evening):** §4.3 resolved the ~16,757-vs-10,988 discrepancy — the
compose's figure was the **uncached slice**, the true prompt is **~16,725 tokens** — and **§4.6**
measured that a **turn-shaped** request reuses **99.92 %** (16,558 of 16,572, leaving **14 tokens** to
prefill), so **the warm-up retires the hazard for a turn** (the cold-start window is NOT abolished — the
warm-up converts a per-conversation cost into a one-time one). **No tool-side config is demanded** — the
lever is the **system prompt** (26.5k chars ≈ 6.7k tokens), which no toolset knob reaches. Record:
`DECISION-p2-9b-stale-timeout-trade.md` §4.3/§4.6; the lesson is `WORKING-RULES.md` **rule 18**.
**`CC-84` (tenancy, the study's driver):** worker MCP calls run as ONE superadmin identity → a
Hermes turn runs platform tools OUTSIDE the chat's tenant; one shared `HERMES_HOME`. Ranked:
per-run minted credential (recommended) → interim fail-closed guard → doc-only rejected.
Also: `CC-51` (falsified). **`CC-90`** (stale pin digest in `verify_pin.py`; source fixed, image rebuild
pending). **mattermost** joins the study as a 10th column later (no rework).
Owner decided: **core architecture first — business modules generated from the core workspace.**
