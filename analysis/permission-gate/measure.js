#!/usr/bin/env node
/**
 * Permission-gate measurement — walk every write verb in every ENABLED module's
 * api/ tree and answer ONE question the D2-gap tool does not:
 *
 *   "Does this write reach the CENTRAL FEATURE GATE, or does it rely on a
 *    bespoke per-route check?"
 *
 * Why this is a separate tool from `../d2-gap/measure.js`. D2-gap measures
 * whether a write reaches a GUARD (the mutation-guard registry: record locks,
 * authority rules, review queues). That is a *structural* check. It says nothing
 * about the FEATURE gate — the "does this actor hold the permission for this
 * action?" decision, made centrally in the dispatcher
 * (`apps/mercato/src/app/api/[...slug]/route.ts`, `checkAuthorization`,
 * `if (requiredFeatures.length)`). A route can pass D2-gap (it runs a guard)
 * and still have no feature check at all. Platform point row 7 ("the platform
 * enforces every one on every write — not just in the UI") is about the FEATURE
 * gate, so it needs its own instrument.
 *
 * The two mechanisms, stated so the classes below are unambiguous:
 *   FEATURE GATE   the route declares `requireFeatures` in its `metadata`
 *                  (or passes them into `makeCrudRoute` / a shared factory).
 *                  Enforced centrally by the dispatcher before the handler.
 *   GUARD REGISTRY the route reaches `runRouteMutationGuards` (directly, via a
 *                  module wrapper, or because `makeCrudRoute` runs the guard
 *                  set). A structural check, NOT a feature check.
 *
 * Classification, per write-verb route FILE:
 *   FEATURE_GATED     declares `requireFeatures` (the central gate fires)
 *   CRUD_FEATURE      built by `makeCrudRoute`/a shared factory, which supplies
 *                     `requireFeatures` from its binding — the central gate fires
 *   GUARD_ONLY        no `requireFeatures`, but reaches the guard registry.
 *                     A structural check with no feature check — named, not hidden.
 *   NEITHER           no `requireFeatures` and no guard. The row-7 gap.
 *
 * ⚠ THE HONEST LIMIT OF THIS TOOL, stated up front.
 *  1. It proves a DECLARATION, not an ENFORCEMENT. A route that declares
 *     `requireFeatures: ['x']` is enforced by the dispatcher; this tool does not
 *     run the dispatcher. That gate is proved separately by
 *     `apps/mercato/src/__tests__/api-authorization.test.ts`.
 *  2. The gate is OPT-IN. The dispatcher enforces only when
 *     `requiredFeatures.length > 0`; a route with `requireAuth: true` and no
 *     `requireFeatures` has no feature check. This tool measures exactly that
 *     exposure, and does not claim the gate is default-deny.
 *  3. A `NEITHER` route is not automatically a hole: several are by design
 *     (auth-flow, self-service, signature-verified webhooks). This tool lists
 *     them; a human decides which are acceptable. That judgement is recorded in
 *     `platform_points.md` row 7, not here.
 *
 * Usage: node measure.js [--json]
 *        node measure.js --check      # exit 1 if a NEITHER route is not on the
 *                                     # by-design allowlist below (a CI gate)
 */
const fs = require('fs');
const path = require('path');

const REPO = process.argv.find((a) => a.startsWith('--repo='))?.slice(7)
  || 'C:/Users/Ramzi/Downloads/companai/workspace/starting-kit';

// The ENABLED set, read from the app's own registry rather than typed by hand
// (same source of truth as the D2-gap tool, so the two agree on scope).
function readEnabledModules() {
  const file = path.join(REPO, 'apps/mercato/src/modules.ts');
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('export const enabledModules');
  const end = src.indexOf('enabledModules.push(', start);
  const block = src.slice(start, end === -1 ? undefined : end);
  const ids = new Set();
  for (const m of block.matchAll(/id:\s*'([a-z_0-9]+)'/g)) ids.add(m[1]);
  return [...ids].sort();
}

function resolveModuleDir(id) {
  const candidates = [
    path.join(REPO, 'packages/core/src/modules', id),
    path.join(REPO, 'packages', id, 'src/modules', id),
    path.join(REPO, 'apps/mercato/src/modules', id),
  ];
  const pkgs = fs.readdirSync(path.join(REPO, 'packages')).filter((p) => !p.startsWith('.'));
  for (const p of pkgs) candidates.push(path.join(REPO, 'packages', p, 'src/modules', id));
  for (const c of candidates) {
    try { if (fs.statSync(c).isDirectory()) return c; } catch { /* keep looking */ }
  }
  return null;
}

// Same four export spellings the D2-gap tool learned to catch.
const ANY_WRITE_EXPORT = /(?:^|\n)\s*export\s+(?:async\s+)?(?:function|const|let|var|\{)[^\n]*\b(POST|PUT|PATCH|DELETE)\b/;
const RE_LOCAL_VERB_DEF = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?(?:function|const|let|var)\s+(POST|PUT|PATCH|DELETE)\b/g;
const RE_REEXPORT_BARE = /(?:^|\n)\s*export\s*\{([^}]*)\}/g;

// The FEATURE gate. A route declares its required features either literally in
// `metadata` or by handing them to a factory. Both count — the dispatcher reads
// the SAME resulting metadata either way.
const RE_REQUIRE_FEATURES = /requireFeatures\s*:/;

/**
 * Strip comments and string/template literals before testing for the feature
 * declaration — a comment that merely MENTIONS `requireFeatures:` (e.g.
 * `// TODO requireFeatures: ['x']`) must not read as a real gate. Found by the
 * hostile-critic pass (2026-10-09): the first version matched the raw text and
 * would have accepted a commented-out declaration. Zero files currently trigger
 * it, so the measured numbers are unchanged — but the class of over-claim is
 * removed rather than left to chance.
 *
 * This is a light tokeniser, not a parser: it removes `//…`, `/*…*​/`, and the
 * contents of '…', "…" and `…` (preserving length with spaces so line structure
 * is irrelevant). Good enough for "is this token inside code?", which is all
 * the classifier needs.
 */
function stripCommentsAndStrings(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (c === '/' && c2 === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c; i++;
      while (i < n && src[i] !== quote) { if (src[i] === '\\') i++; i++; }
      i++;
      out += '""';
      continue;
    }
    out += c; i++;
  }
  return out;
}

// `makeCrudRoute` / a shared factory supplies requireFeatures from its binding.
const RE_CRUD = /makeCrudRoute\b|createCrudRoute\b|\bcrud\.(?:POST|PUT|PATCH|DELETE)\b|make[A-Za-z]*Route\s*\(/;
// Guard reach — the D2-gap classes, collapsed to one "does it reach a guard".
const RE_WRAPPER = /begin[A-Za-z]*MutationGuard\s*\(/;
const RE_REGISTRY = /runRouteMutationGuards\s*\(/;
const RE_REGISTRY_INLINE = /getAllMutationGuardInstances\s*\(/;
const RE_DEPRECATED = /validateCrudMutationGuard\s*\(|runCrudMutationGuardAfterSuccess\s*\(/;
const LOCAL_GUARD_HELPERS = [
  /\brunMessageMutationGuards\s*\(/,
  /\brunIntegrationMutationGuards\s*\(/,
  /\brunPaymentGatewayMutationGuards\s*\(/,
  /\brunStaffMutationGuards\s*\(/,
  /\bvalidateRouteMutationGuard\s*\(/,
  /\b(?:runGuardedNotificationWrite|createBulkNotificationRoute|createSingleNotificationActionRoute)\s*\(/,
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

function writeVerbs(src) {
  const verbs = new Set();
  // local definitions
  for (const m of src.matchAll(RE_LOCAL_VERB_DEF)) verbs.add(m[1]);
  // re-exports: `export { POST }` / `export { POST } from './x'`
  for (const m of src.matchAll(RE_REEXPORT_BARE)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(name)) verbs.add(name);
    }
  }
  return [...verbs];
}

/**
 * A route file can be a RE-EXPORT SHIM. `webhooks/api/[id]/route.ts` is one:
 *   export { metadata, GET, PUT, DELETE, openApi } from '../webhooks/[id]/route'
 * The shim's own text carries no `requireFeatures` and no guard — the real
 * route file does. Reading only the shim misclassifies a fully gated route as
 * NEITHER, which is the same over-claim class the D2-gap tool documents and
 * fixes. So when a file's write verbs come from a bare re-export and its own
 * body declares nothing, follow the FIRST `from '<path>'` target and classify
 * on the target's text instead. Depth-capped so a cycle cannot hang the run.
 */
const RE_REEXPORT_FROM = /(?:^|\n)\s*export\s*\{[^}]*\b(?:POST|PUT|PATCH|DELETE)\b[^}]*\}\s*from\s*['"]([^'"]+)['"]/;

function resolveReexport(file, src, depth = 0) {
  if (depth > 4) return src;
  const m = src.match(RE_REEXPORT_FROM);
  if (!m) return src;
  const target = m[1];
  if (!target.startsWith('.')) return src; // a package specifier — not resolvable here
  const base = path.resolve(path.dirname(file), target);
  for (const ext of ['.ts', '.tsx', '/route.ts', '/index.ts']) {
    const candidate = base + ext;
    try {
      if (fs.statSync(candidate).isFile()) {
        return resolveReexport(candidate, fs.readFileSync(candidate, 'utf8'), depth + 1);
      }
    } catch { /* try next */ }
    try {
      const asFile = path.join(base, ext.replace(/^\//, ''));
      if (fs.statSync(asFile).isFile()) {
        return resolveReexport(asFile, fs.readFileSync(asFile, 'utf8'), depth + 1);
      }
    } catch { /* try next */ }
  }
  return src;
}

function declaresFeatures(src) {
  // Test against the comment/string-stripped source so a commented-out or
  // quoted `requireFeatures:` is not mistaken for a real declaration.
  return RE_REQUIRE_FEATURES.test(stripCommentsAndStrings(src));
}

function reachesGuard(src) {
  const code = stripCommentsAndStrings(src);
  if (RE_WRAPPER.test(code) || RE_REGISTRY.test(code) || RE_REGISTRY_INLINE.test(code) || RE_DEPRECATED.test(code)) return true;
  return LOCAL_GUARD_HELPERS.some((re) => re.test(code));
}

function classify(src) {
  const feature = declaresFeatures(src);
  // A CRUD/factory route supplies features from its binding; treat the factory
  // itself as a feature carrier ONLY when it is the file's route builder — the
  // dispatcher reads the resulting metadata. The factory is also a guard carrier.
  const crud = RE_CRUD.test(stripCommentsAndStrings(src));
  const guard = reachesGuard(src);
  if (feature) return 'FEATURE_GATED';
  if (crud) return 'CRUD_FEATURE';
  if (guard) return 'GUARD_ONLY';
  return 'NEITHER';
}

/**
 * The by-design exceptions — a write route with NO central feature gate whose
 * absence of a feature check is correct, because the request is not authorised
 * by a role permission at all. Each is named with its authorisation mechanism,
 * so a reader can re-verify it rather than trust the list.
 *
 * A route belongs here ONLY when its protection is a DIFFERENT, deliberate
 * mechanism — never to silence a genuine gap. Adding an entry is a decision, and
 * the reason must be written next to it.
 */
const BY_DESIGN_NO_FEATURE = {
  // Self-service: the actor acts on their OWN record, verified by password or
  // session — a role permission would be meaningless (everyone may set their
  // own locale / edit their own profile).
  'packages/core/src/modules/auth/api/locale/route.ts': 'self-service: sets the caller’s own locale cookie (requireAuth:false)',
  'packages/core/src/modules/auth/api/profile/route.ts': 'self-service: the caller edits their OWN profile (requireAuth:true, own password re-verified)',
  // Inbound webhooks: authenticated by a provider SIGNATURE/JWT or an endpoint
  // secret, not by a session. The sender is an external system, not a user with
  // a role.
  'packages/core/src/modules/communication_channels/api/post/webhook/[provider]/route.ts': 'signature-verified inbound webhook (requireAuth:false)',
  'packages/core/src/modules/communication_channels/api/post/webhooks/gmail/route.ts': 'JWT-verified inbound webhook (requireAuth:false)',
  'packages/webhooks/src/modules/webhooks/api/inbound/[endpointId]/route.ts': 'signature-verified inbound webhook (requireAuth:false, adapter.verifyWebhook)',
  // Infrastructure probe, not a resource mutation.
  'apps/mercato/src/modules/ratelimit_probe/api/ping/route.ts': 'rate-limit probe endpoint (requireAuth:false); touches no resource',
};

function main() {
  const enabled = readEnabledModules();
  const rows = [];
  for (const id of enabled) {
    const dir = resolveModuleDir(id);
    if (!dir) continue;
    const apiDir = path.join(dir, 'api');
    let files = [];
    try { files = walk(apiDir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('route.ts') && !f.endsWith('.ts')) continue;
      if (!f.endsWith('route.ts')) continue; // only mounted route files
      const src = fs.readFileSync(f, 'utf8');
      if (!ANY_WRITE_EXPORT.test(src)) continue;
      const verbs = writeVerbs(src);
      if (!verbs.length) continue;
      // Follow a re-export shim to the real route file before classifying, so a
      // gated route reached through a shim is not read as NEITHER.
      const effective = resolveReexport(f, src);
      const klass = classify(effective);
      rows.push({
        module: id,
        file: path.relative(REPO, f).replace(/\\/g, '/'),
        verbs: verbs.join(','),
        klass,
      });
    }
  }

  const byKlass = rows.reduce((acc, r) => { acc[r.klass] = (acc[r.klass] || 0) + 1; return acc; }, {});
  const total = rows.length;
  const out = {
    repo: REPO,
    enabledModules: enabled.length,
    writeRouteFiles: total,
    byClass: {
      FEATURE_GATED: byKlass.FEATURE_GATED || 0,
      CRUD_FEATURE: byKlass.CRUD_FEATURE || 0,
      GUARD_ONLY: byKlass.GUARD_ONLY || 0,
      NEITHER: byKlass.NEITHER || 0,
    },
    // The row-7 exposure: writes with neither the central feature gate nor a guard.
    neither: rows.filter((r) => r.klass === 'NEITHER').map((r) => `${r.file} [${r.verbs}]`),
    guardOnly: rows.filter((r) => r.klass === 'GUARD_ONLY').map((r) => `${r.file} [${r.verbs}]`),
  };

  if (process.argv.includes('--check')) {
    // The row-7 invariant: every write route in an ENABLED module either reaches
    // the central feature gate (or a factory that supplies it) or is a named
    // by-design exception. A new NEITHER route fails the check.
    const unexplained = out.neither.filter((entry) => {
      const file = entry.split(' [')[0];
      return !(file in BY_DESIGN_NO_FEATURE);
    });
    if (unexplained.length) {
      console.error(`FAIL: ${unexplained.length} write route(s) have no feature gate and are not by-design exceptions:`);
      for (const r of unexplained) console.error(`  - ${r}`);
      console.error('\nEither add a `requireFeatures` declaration (or route through a guard-backed factory),');
      console.error('or, if the route is genuinely authorised by a different mechanism, add it to');
      console.error('BY_DESIGN_NO_FEATURE in this file WITH the reason.');
      process.exit(1);
    }
    // Also fail if an allowlisted route is gone (stale entry) or now gated
    // (the entry should be removed so the list stays honest).
    for (const file of Object.keys(BY_DESIGN_NO_FEATURE)) {
      const stillNeither = out.neither.some((entry) => entry.split(' [')[0] === file);
      if (!stillNeither) {
        console.warn(`NOTE: '${file}' is on the by-design list but is no longer an unexplained route — remove its entry.`);
      }
    }
    console.log(`OK: ${out.writeRouteFiles} write route files; ${out.byClass.FEATURE_GATED + out.byClass.CRUD_FEATURE} feature-gated; ` +
      `${out.byClass.GUARD_ONLY} guard-only; ${out.byClass.NEITHER} by-design exceptions.`);
    return;
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(out, null, 2));
    return;
  }
  console.log(`Enabled modules:        ${out.enabledModules}`);
  console.log(`Write route files:      ${out.writeRouteFiles}`);
  console.log(`  FEATURE_GATED:        ${out.byClass.FEATURE_GATED}  (central gate fires)`);
  console.log(`  CRUD_FEATURE:         ${out.byClass.CRUD_FEATURE}  (factory supplies features)`);
  console.log(`  GUARD_ONLY:           ${out.byClass.GUARD_ONLY}  (a guard, but no feature check)`);
  console.log(`  NEITHER:              ${out.byClass.NEITHER}  <-- the row-7 gap`);
  if (out.guardOnly.length) {
    console.log('\nGUARD_ONLY (a structural check with no feature check):');
    for (const r of out.guardOnly) console.log(`  - ${r}`);
  }
  if (out.neither.length) {
    console.log('\nNEITHER (no feature gate and no guard — classify by hand):');
    for (const r of out.neither) console.log(`  - ${r}`);
  }
  console.log(`\nFeature-covered (FEATURE_GATED + CRUD_FEATURE) = ${out.byClass.FEATURE_GATED + out.byClass.CRUD_FEATURE} / ${total}`);
}

main();
