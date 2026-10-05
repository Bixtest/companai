# Findings 05 — Extensibility and isolation

**Covers batches 8 and 9:** plugins, the MCP tool gateway, connections and the secrets manager; and
workspaces, runtime and sandbox isolation.

**The one-line result.** The **tool-access governance** here is a second, independent confirmation that
our `AH-8` plan is right — and it is more built-out than the first study recorded. The **plugin
capability model** is the one genuinely new idea: how to let a third party extend a platform **without
forking it**, and without trusting it.

---

## 1. A capability manifest, validated twice — **LEARN** (the new idea in this batch)

**What it is.** A third-party plugin declares a **static capability list**. That list is checked at
**install** (a feature whose capability is missing is rejected), and again at **runtime**, on **every
call** from the plugin worker to the host. **Unknown operations are rejected by default.**

**Evidence.** `doc/plugins/PLUGIN_SPEC.md:790-796` (the manifest declares capabilities);
`server/src/services/plugin-loader.ts:1313` (`validateManifestCapabilities()` rejects at install);
`server/src/services/plugin-capability-validator.ts:44-150` (operation → required capabilities) and
`:391-405, 425-433` (`assertOperation()` throws 403; **unknown operations rejected**);
`packages/plugins/sdk/src/host-client-factory.ts:675-700, 594-635` (every worker→host method runs
through `requireCapability` + `requireInvocationCompanyScope` before dispatch), wired with the
manifest's capabilities at `server/src/app.ts:921-925`.

**The part worth copying most.** `requireInvocationCompanyScope` binds **each call** to the host-
registered invocation's `companyId` (`host-client-factory.ts:628-634`), so a worker **cannot** ask for
another company's data even if it has the capability. Capability and scope are separate checks.

**A second, unusual rule.** A plugin **update that adds a capability** is held `upgrade_pending` until
an operator approves it (`doc/plugins/DISTRIBUTION-PLUGINS.md:28-34, 57-69`). A plugin cannot silently
grant itself more power on upgrade.

**What we have.** Nothing. We have no plugin model.

**Verdict: LEARN, and decide whether we want one.** If Companai is ever extended by third parties, this
is the pattern: capabilities validated at install *and* per call, scope bound per invocation, and
capability expansion requiring a human. It is a governance model for code, which is squarely our
subject.

---

## 2. Out-of-process workers, and the isolation they do **not** have — **LEARN + WARN**

**What it is.** A plugin runs as its own Node worker over JSON-RPC on stdio
(`doc/plugins/PLUGIN_SPEC.md:447-462`), with state in Postgres tables `plugins`, `plugin_config`,
`plugin_state`, `plugin_jobs`, `plugin_webhook_deliveries` (`:1274-1388`).

**The warning.** A plugin's **UI** is not sandboxed: it runs as same-origin JavaScript, and the manifest
capabilities **do not** stop it calling ordinary HTTP APIs (`PLUGIN_SPEC.md:23-24`); iframe isolation is
explicitly future work (`:1822`). Distribution is also single-host — installs need a writable local
filesystem (`:25-35, 268`).

**Verdict: LEARN the worker model; WARN the UI.** A capability list governs the **host API**, not the
browser. Do not assume it is a security boundary.

---

## 3. The tool-access gate, in full — **CONFIRMATION** (AH-8) with the mechanism now visible

**What it is.** Two separate questions: **a profile** says *can this agent see this tool*; **a policy**
says *is this exact call allowed right now* (`doc/MCP-ACCESS-GOVERNANCE.md:62`).

**Evidence.** `server/src/services/tool-access-policy.ts:1343-1483` (`decide()`): quarantine or disabled
→ deny; profile membership; then policies **in priority order**, where **`block` short-circuits**,
`rate_limit` consumes a counter, and `trust_rule` / `require_approval` / `allow` decide; otherwise
`deny_default` (`:1482`). The UI's tri-state — `"allowed" | "ask_first" | "off"`
(`ui/src/features/connections/remote-mcp/types.ts:3`) — maps to a profile include plus a
`require_approval` policy (`tool-access-policy.ts:1453-1457`). Approvals are bound to the arguments
(finding 01 §4), and a **trust rule carries the catalog and schema hash and stops applying on drift**
(`:1430-1451`).

**What we have.** `AH-8` — *"MCP governance — binding precedence (narrowest-first), changed-tool
quarantine, argument-bound approvals."* All three are in our item.

**Verdict: CONFIRMATION.** Our item is right and complete. What is new is the **detail**: the policy
order, the `deny_default`, and the fact that a trust rule **expires when the tool changes** — that last
one is the mechanism behind "changed-tool quarantine" and we had only the words.

---

## 4. Sandbox capability intersection — **LEARN**

**What it is.** What a sandbox provider can do is `verified ∩ declared ∩ narrowing`: a provider's
declaration **never grants** what it did not advertise, and **omitting** a capability never grants it.

**Evidence.** `doc/plugins/SANDBOX_PROVIDER_CAPABILITIES.md:36-56`.

**Verdict: LEARN.** A clean rule for trusting a provider's own claims conservatively. It generalises to
any adapter we add (a model provider, a vector store, a storage backend).

---

## 5. Local isolation, concretely — **LEARN**

| Mechanic | Evidence | Why |
|---|---|---|
| **bubblewrap with an egress allowlist** | `packages/adapter-utils/src/local-process-sandbox.ts:380-490` — `--unshare-pid/ipc/uts/net`, tmpfs `/`, read-only system binds, a writable workspace, and an allowlist HTTP CONNECT proxy on loopback (`:230-310`) | The only way to run an agent locally without giving it the network |
| **Symlink-escape prevention** | `server/src/services/plugin-local-folders.ts:222-235, 277-304` — `realpath` checks | Path checks without `realpath` are not checks |
| **A write-lock outside the target** | `doc/workspace-restore-locks.md:9-23` — a per-target SQLite `BEGIN IMMEDIATE` file lock, kept outside the workspace | Locking a directory you are about to replace does not work |

**Verdict: LEARN.** We run agents locally. This is the shape of the isolation we will need, and it is
cheap to borrow.

---

## 6. Secrets stay out of the platform — **LEARN**

**What it is.** The **values** live in a secret store (AWS Secrets Manager); the platform stores only an
`externalRef` and version metadata (`doc/SECRETS-AWS-PROVIDER.md:293-297`).

**What we have.** Our backlog says tenant secrets never enter a Hermes home (`C-7`, confirmed). This is
the same principle, one layer further out.

**Verdict: LEARN.** Consistent with a rule we already hold, and it is the reference implementation.

---

## 7. Warnings worth keeping

| Warning | Evidence | Why it matters to us |
|---|---|---|
| **The gateway can be bypassed** | `doc/MCP-ACCESS-GOVERNANCE.md:135` — an unmanaged client bypasses the gateway and they "cannot prevent or audit that bypass"; endpoint mode `/mcp` is not policy-governed (`:434`) | If a tool path exists that skips the gate, the gate is advisory. Our claim is "one place decides" |
| **A risk classifier that falls through to "read"** | `server/src/services/tool-access.ts:2414` — unknown providers classify as `read`; the file is ~20,000 lines | Fail-open classification is the opposite of what a governance layer needs |
| **A rate limit held in process memory** | `server/src/services/plugin-secrets-handler.ts:175-195` | Does not hold across nodes; a limit that resets on restart is not a limit |
| **Two enormous files** | `tool-access.ts` ≈ 20k lines, `tool-gateway.ts` ≈ 11k | The same lesson as finding 02: extract the decision, keep the adapter thin |
