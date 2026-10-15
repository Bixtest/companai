# Batch 06 — Out-of-Pole (PZ)

**Study:** n8n `2.44.0` · **Batch:** 06 of 07 · **Status:** COMPLETE
**Source:** `C:\n8n` · **Zip md5:** `7cc78a5ea124ba2c270bccabf282d9ed` · **License:** fair-code (§ batch 00)
**Method:** rules 1-10 of `00-PIN-AND-METHOD.md`. Every claim carries `file:line`.

---

## 0. What this batch had to answer

**PZ** is the escape hatch: anything else that fits the vision. n8n's answer is the most unusual in the
study — because the most interesting out-of-pole material is **the tooling n8n built to let AI agents work
on n8n itself**.

Short answer, measured:

| Area | What is there | Where |
|---|---|---|
| **Quality gates** | **Two baseline files that can only shrink** — `.boundaries-baseline.json` (110 issues) and `.code-health-baseline.json` (**299 violations, 127 files, 6 rules**) | F06-01/02 |
| **The agent harness** | A **pinned, integrity-validated bundle** fetched from a GitHub release, installed into the repo | F06-03 |
| **Agent checks** | A runner that **withholds full output from the agent** and saves it to disk — a deliberate context budget | F06-04 |
| **Licence enforcement** | A **`@licensed` method decorator** that attaches a feature to the route's metadata | F06-05 |
| **Telemetry** | **PostHog, enabled by default**, with the project API key in the source | F06-06 |
| **Community packages** | A **scanner** that checks **provenance** | F06-07 |
| **The one empty seam** | `packages/extensions/` — **one file, `.gitkeep`, 0 bytes** | F06-08 |

---

## 1. The quality gates — two ratchets

### 1.1 The boundaries baseline

`.boundaries-baseline.json` is **20 bytes**:

```json
{
  "issues": 110
}
```

Enforced by `scripts/check-boundaries.mjs`. **So there is a known, counted budget of 110 architectural
boundary issues, and the gate's job is to stop it growing.**

### 1.2 The code-health baseline

`.code-health-baseline.json` is **66,778 bytes** and holds **299 violations across 127 files**, each with
a `rule`, a `line`, a `message` and a **`hash`**:

| Rule | Count | What it enforces |
|---|---:|---|
| **`lint-config-layering`** | **143** | lint config must be layered per module |
| **`typeorm-persistence-boundary`** | **83** | the persistence boundary |
| `catalog-violations` | 31 | dependencies must use the workspace catalog |
| `single-instance-libs` | 28 | single-instance libs must be **peer** dependencies |
| `stale-overrides` | 13 | stale overrides |
| `encryption-boundary` | 1 | the encryption boundary |

And the messages show the rules are real, not decorative:
> *"langsmith@^0.4.6 should use "catalog:" (exists in pnpm-workspace.yaml)"*
> *""@langchain/core" is a runtime dependency of "@n8n/ai-workflow-builder"; **it must be a
> peerDependency**."*

**➜ F06-01 [foundational] — n8n ships a hashed baseline of 299 known architectural violations, and the
gate can only make it smaller.** **Plain meaning:** the team measured its own debt, wrote it down with a
hash per violation, and made the build fail if the list grows. **Why it matters:** it is the retirement
rule (rule 10) turned into CI — debt is *recorded and ratcheted* rather than argued about, and the six
rules are genuine architecture rules (persistence, encryption, single-instance libs), not style nits.

**➜ F06-02 [foundational] — The boundaries baseline counts to 110, and `check-boundaries.mjs` enforces
it.** **Plain meaning:** a second, coarser ratchet for module boundaries. **Why it matters:** two
independent baselines mean a large refactor can be planned instead of forbidden.

---

## 2. The agent harness — n8n's own AI tooling

`agent-harness.lock.json` pins an external bundle:

```json
{ "repository": "n8n-io/cat-bot", "releaseTag": "harness-v0.6.0",
  "version": "0.6.0", "assetName": "n8n-opencode-harness-0.6.0.tgz" }
```

And `scripts/agent-harness.mjs` **validates the lock before using it**:

```js
export function validateLock(lock) {
	if (
		lock?.repository !== REPOSITORY ||                                   // 'n8n-io/cat-bot'
		!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(lock.version) ||
		lock.releaseTag !== `harness-v${lock.version}` ||
		lock.assetName !== `n8n-opencode-harness-${lock.version}.tgz`
	) { throw new Error('The agent harness lock is invalid.'); }
	return lock;
}
```

**➜ F06-03 [foundational] — n8n runs AI agents on its own repository through a **pinned release** fetched
from a separate repository, with a **validated lock** that checks the repository, the semver, the tag and
the asset name before anything is installed.** **Plain meaning:** the tooling an agent uses is treated
like a dependency — pinned, verified and revocable — not trusted because it is local. **Why it matters:**
it is the first time in this study a platform has been measured building the *harness* for agents working
on itself, and it does so with a supply-chain discipline most human dependencies do not get.

*(The bundle root is `n8n-opencode-harness` and the plugin file is `n8n-harness.js` — so the agent runtime
is OpenCode, named in the asset, and the harness installs as a plugin.)*

---

## 3. `agent-check.mjs` — a context budget for the agent

`scripts/agent-check.mjs` opens with its purpose:

> *"Capture focused checks **without sending the full runner output to the agent**."*

And its help text states the mechanism:

> *"Each run saves its full output and `summary.json` in a unique `.agent-setup/checks/` directory. **The
> console shows only the result and a short failure excerpt.**"*

Modes are `lint`, `typecheck`, `test` and `playwright`, invoked as `pnpm agent:lint`, `pnpm agent:test`,
etc.

**➜ F06-04 [foundational] — The check runner is designed for the agent's context budget: full output goes
to disk, the agent sees a one-line result and a short excerpt.** **Plain meaning:** a linter that dumps
2,000 lines into an agent's window would waste the window; so the output is filed and only the verdict is
shown. **Why it matters:** it is the same discipline this study applies to itself (a context budget is a
stated rule), found in a production repo — and it is the difference between an agent that can work and
one that drowns.

---

## 4. Licence enforcement — a decorator, not a wrapper

`packages/@n8n/decorators/src/controller/licensed.ts` is **13 lines**:

```ts
export const Licensed =
	(licenseFeature: BooleanLicenseFeature): MethodDecorator =>
	(target, handlerName) => {
		const routeMetadata = Container.get(ControllerRegistryMetadata).getRouteMetadata(
			target.constructor as Controller,
			String(handlerName),
		);
		routeMetadata.licenseFeature = licenseFeature;
	};
```

**➜ F06-05 [foundational] — A licensed feature is *marked*, not wrapped: the decorator attaches a
`BooleanLicenseFeature` to the route's metadata, and one registry enforces it.** **Plain meaning:** you
write `@Licensed('feat:xyz')` over a handler and the platform knows; you do not sprinkle licence checks
through the code. **Why it matters:** it is the same "one seam, many providers" discipline found in
Multica and Gas Town, applied to the commercial boundary — and it means an unlicensed install *cannot*
accidentally reach a feature, because the feature was never wired to it.

*(The supporting pieces are all present and measured: `@n8n/backend-common/src/license-state.ts`,
`@n8n/config/src/configs/license.config.ts`, `@n8n/db/src/repositories/license-metrics.repository.ts`, and
the CLI's `license clear|info` commands from batch 01.)*

---

## 5. Telemetry — on by default, with the key in the source

`packages/@n8n/config/src/configs/diagnostics.config.ts`:

```ts
@Config
export class DiagnosticsConfig {
	/** Whether anonymous diagnostics and telemetry are enabled for this instance. */
	@Env('N8N_DIAGNOSTICS_ENABLED')
	enabled: boolean = true;                       // ← ON by default
	…
}
@Config
class PostHogConfig {
	/** PostHog project API key for product analytics. */
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_KEY')
	apiKey: string = 'phc_kMstNfAgBcBkWSh6KdsgN09heqqNe5VNmalHP1Ni9Q4';
	@Env('N8N_DIAGNOSTICS_POSTHOG_API_HOST')
	apiHost: string = 'https://ph.n8n.io';
}
```

**➜ F06-06 [foundational] — Telemetry is **opt-out, not opt-in**: `enabled` defaults to `true`, the
endpoint is PostHog, and the project API key is a hardcoded default in the source.** **Plain meaning:** a
fresh self-hosted n8n reports anonymous usage until someone turns it off. **Why it matters:** it is a real
product decision with a privacy consequence, and the study records it as measured — the key is a public
analytics identifier rather than a secret, but the default-on posture is the fact that matters. (Per
`AGENTS.md`, the JSDoc on an `@Env` property **is public documentation**, which is why these comments are
written for an operator.)

---

## 6. Community packages — scanned for provenance

The community-node mechanism is **not** `packages/extensions/` (§7). It is:

| Location | What it is |
|---|---|
| **`@n8n/scan-community-package/`** | a scanner — **9 files**, including `scanner/cli.mjs`, **`scanner/provenance.mjs`**, `scanner/scanner.mjs` |
| `cli/src/modules/community-packages/` | the install/management path |
| `@n8n/eslint-plugin-community-nodes/` | lint rules for community nodes |

**➜ F06-07 [foundational] — A community package is *scanned*, and one of the things scanned is its
**provenance**.** **Plain meaning:** before n8n installs a third-party node it checks where it came from,
not just what it does. **Why it matters:** it is the supply-chain answer for a platform whose value is
1,500+ integrations, and it pairs with the pinned harness (§2) — n8n applies the same discipline to code
it runs as to code that runs on it.

---

## 7. The one empty seam

**`packages/extensions/` contains exactly one file: `.gitkeep`, 0 bytes.** A sweep of all 57 `@n8n`
packages found only one other thin package (`create-node`, 4 files — the CLI scaffolder from batch 05).
So this is the **only** genuinely empty directory in the package tree.

**➜ F06-08 [foundational] — `packages/extensions/` is an empty placeholder; the extension mechanism
lives in `scan-community-package` and `cli/src/modules/community-packages` instead.** **Plain meaning:**
a directory named "extensions" holds nothing, and the thing it appears to promise is elsewhere. **Why it
matters:** it is the same trap as CrewAI's unpopulated `ToolFilterContext` — a name is not a capability —
and recording it stops a later batch from citing `packages/extensions/` as evidence of an extension
system.

---

## 8. Findings

Tagged by pole; answered against **Q1 · USER VALUE** and **Q2 · VISION VALUE**.

| # | Finding | Pole | Q1 · User value | Q2 · Vision value |
|---|---|---|---|---|
| **F06-01** | **A hashed baseline of 299 architectural violations, 6 rules, that can only shrink.** | PZ | The codebase gets better by construction. | The retirement rule as CI. |
| **F06-02** | **A boundaries baseline of 110 issues**, enforced by `check-boundaries.mjs`. | PZ | Refactors can be planned. | A second, coarser ratchet. |
| **F06-03** | **A pinned, lock-validated agent harness** fetched from a separate repository. | PZ | (indirect) | Agents treated as a supply chain, not a convenience. |
| **F06-04** | **`agent-check.mjs` files the full output and shows the agent a short excerpt.** | PZ | (indirect) | A context budget in production code. |
| **F06-05** | **Licence enforcement is a `@licensed` decorator on route metadata**, not scattered checks. | PZ/P2 | A feature cannot be reached without its licence. | One seam for the commercial boundary. |
| **F06-06** | **Telemetry is opt-out and defaults to on**, PostHog, key in source. | PZ | (a privacy consequence, stated plainly) | Recorded as measured, not judged. |
| **F06-07** | **Community packages are scanned, including for provenance.** | PZ/PZ-W | Third-party nodes are checked, not trusted. | A supply-chain answer for an integration platform. |
| **F06-08** | **`packages/extensions/` is empty** — the mechanism is elsewhere. | PZ | (n/a) | A name is not a capability; recorded. |
| **F06-09** | **The `@Env` JSDoc is public documentation** (`AGENTS.md`) — which is why `diagnostics.config.ts` reads like an operator's manual. | PZ | Self-hosters can configure from the source. | Documentation and code cannot drift. |
| **F06-10** | **The scripts are a real toolchain** — `check-boundaries`, `check-workspace-deps`, `check-workspace-private-deps`, `block-npm-install` (the `preinstall` hook), `agent-check`, `agent-setup`, `agent-harness`. | PZ | (indirect) | The guardrails are executable. |
| **F06-11** | **`lefthook.yml` wires git hooks** (`pre-commit` biome, `post-merge`/`post-checkout` a pnpm check). | PZ | (indirect) | Gates run before code lands. |
| **F06-12** | **`agent-setup.mjs` + `.agent-setup/`** — a per-agent working directory with a `checks/` subdirectory. | PZ | (indirect) | The agent's workspace is a first-class, isolated path. |

---

## 9. Divergences and honest bounds

- **One correction to the study's own earlier framing, recorded per rule 13:** the batch-00 plan named
  *"extensions"* as the out-of-pole subject, implying a mechanism at `packages/extensions/`. That directory
  is empty; the mechanism is `scan-community-package` + `cli/src/modules/community-packages`. **The plan's
  word was misleading, not wrong, and the correction is recorded rather than applied silently.**
- **Bound:** this batch read the **quality gates, the agent tooling, the licence decorator, the telemetry
  config and the community scanner's layout**. It did **not** read `scanner.mjs` or `provenance.mjs` in
  full (what exactly is scanned is not claimed), nor the licence *state machine* behind the decorator.
- **Bound:** the telemetry finding is read from the config's **defaults**; what a given deployment
  actually sends depends on runtime, which this study has not traced.
- **Bound (stated plainly):** the PostHog key is recorded as *what the source declares*. Whether it is a
  secret is a judgement the study does not make — it is a public analytics project key by its shape, and
  the finding is the default-on posture.

---

## 10. Carried forward to batch 07 (the synthesis)

Four candidates for the highest transferable value, to be ranked in batch 07:

1. **The two ratchets (F06-01 / F06-02)** — measured, hashed architectural debt that CI can only reduce.
2. **The pinned, validated agent harness (F06-03)** — agents as a supply chain.
3. **The context-budget check runner (F06-04)** — full output to disk, verdict to the agent.
4. **Licence-as-metadata (F06-05)** — one decorator, one registry, no scattered checks.

All four are **observations**, not decisions. The cross-platform mapping is a later pass (rule 5).

---

*Batch 06 of 07. Read from source on 2026-10-15. Next: `findings/07-SYNTHESIS.md`.*
