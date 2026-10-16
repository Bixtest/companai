// High-precision SVG diagrams for each batch of the OpenRig Platform Study.
// Adaptive colours use the reader's CSS custom properties so the diagrams follow
// the active theme (Light / Dark / Sepia / Night) without any JS.
//
// Every diagram is a self-contained string wrapped in the shared markup:
//   <div class="diagram-wrapper"> <div class="diagram-header"> … <div class="diagram-svg-container"> <svg …>
// The generator reads: getMasterDiagram(), getBatchDiagram(n), getAllDiagrams(), DIAGRAMS_CATALOG.
//
// Every fact drawn below is a restatement of a finding already verified in the
// study markdown (file:line citations live in the batches). No new source claims
// are introduced here, and no study markdown is edited to fit this file.

// Shared <defs> so every diagram has the same arrow markers without collisions.
function arrowDefs(suffix) {
  return `
      <defs>
        <marker id="arr-${suffix}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--diagram-accent, #7c3aed)"/>
        </marker>
        <marker id="arrg-${suffix}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981"/>
        </marker>
        <marker id="arrr-${suffix}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444"/>
        </marker>
      </defs>`;
}

// ---------------------------------------------------------------------------
// MASTER — Executive topology: the three poles, the gate culture, and the two
// measured zeros that define where OpenRig stops.
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>OpenRig Platform Study Topology: a local cockpit with no tenant, and the study's most transferable gate</h4>
    <p>Where each studied mechanism lands, and the two measured zeros that define the platform</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 470" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('master')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">OpenRig 0.6.10 — A LOCAL DAEMON + CLI + TUI + MCP SERVER</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">One SQLite file at $OPENRIG_HOME/openrig.sqlite · daemon port 7433 · Apache-2.0 · TypeScript monorepo (4 packages)</text>

      ${card(40, 72, 280, 150, 'P1 — THE AISSISTANT', [
        'An agent is NOT OpenRig’s',
        'Unmodified Claude Code / Codex in tmux',
        'YAML blueprint + a seat address',
        { text: '★ THE PERMISSION SEAM', color: '#7c3aed' },
        { text: 'the two-surface rule', color: '#059669' },
        { text: '5 built-ins (+ a translating skill)', color: '#059669' }
      ])}

      ${card(340, 72, 280, 150, 'P2 — THE WORKSPACE', [
        'A rig = nodes + typed edges',
        'A workspace = root + named repos',
        'A durable queue of work',
        { text: '★ NO TENANCY AT ALL', color: '#ef4444' },
        { text: '0 tenant_id in 105 migrations', color: '#ef4444' },
        { text: 'boundary = loopback / Tailscale', color: '#ef4444' }
      ])}

      ${card(640, 72, 280, 150, 'P3 — AUTOMATIONS', [
        'A queue of obligations',
        'Hot-potato closure contract',
        'done → one of 7 closure reasons',
        { text: '★ THE WAKE LADDER', color: '#7c3aed' },
        { text: 'obligation exactly-once', color: '#059669' },
        { text: 'wake at-least-once', color: '#059669' }
      ])}

      <path d="M 180 222 L 180 258" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-master)"/>
      <path d="M 480 222 L 480 258" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-master)"/>
      <path d="M 780 222 L 780 258" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-master)"/>

      ${card(40, 262, 280, 132, 'PX — WIDGETS & FRONTEND', [
        'TWO frontends, neither composable',
        'TUI: 191 files / 29,473 lines / 0 .tsx',
        'UI: 538 files / 88,829 lines (maintenance)',
        { text: '★ NO WIDGET MODEL (6th)', color: '#ef4444' },
        { text: '★ the digital-twin harness', color: '#059669' },
        { text: 'stripAnsi invariant (11 tests)', color: '#059669' }
      ])}

      ${card(340, 262, 280, 132, 'PZ — THE GATE CULTURE', [
        '4 guard scripts, each with a test',
        'The gate lane: refuse, not queue',
        '★ THE 4-RAIL EXCLUSION LEDGER',
        { text: 'green carries the load it ran under', color: '#059669' },
        { text: 'the completed self-destruct', color: '#059669' },
        { text: 'the study’s most transferable PZ', color: '#7c3aed' }
      ])}

      ${card(640, 262, 280, 132, 'RULE 10 — RETIREMENT', [
        '★ Self-expiring bridge + tombstone',
        '★ a test asserts it stays deleted',
        'BUT: rigged → openrig residue',
        { text: '284 RIGGED_* / 85 files / 22 names', color: '#ef4444' },
        { text: 'docs document only 5', color: '#ef4444' },
        { text: 'done for one, failed at scale', color: '#b45309' }
      ])}

      <rect x="340" y="412" width="280" height="44" rx="8" fill="var(--surface-card, #ffffff)" stroke="#ef4444" stroke-width="1.4"/>
      <text x="480" y="432" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#ef4444">TWO MEASURED ZEROS</text>
      <text x="480" y="448" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">no tenancy · no widget model — the strongest argument to build both</text>
    </svg>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// CARD HELPER — one shared box renderer for every diagram
// ---------------------------------------------------------------------------
function card(x, y, w, h, title, lines, opts) {
  opts = opts || {};
  const stroke = opts.stroke || 'var(--border-color, #e2e8f0)';
  const titleColor = opts.titleColor || 'var(--text-primary, #0f172a)';
  const bullets = (lines || []).map((ln, i) => {
    const ly = 44 + i * 17;
    const cls = typeof ln === 'object' ? ln : { text: ln };
    return `<text x="12" y="${ly}" font-family="system-ui, sans-serif" font-size="10.5" fill="${cls.color || 'var(--text-secondary, #475569)'}">${cls.text}</text>`;
  }).join('\n        ');
  return `<g transform="translate(${x}, ${y})">
        <rect width="${w}" height="${h}" rx="8" fill="var(--surface-card, #ffffff)" stroke="${stroke}" stroke-width="${opts.sw || 1.2}"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="${titleColor}">${title}</text>
        ${bullets}
      </g>`;
}

// ---------------------------------------------------------------------------
// BATCH DIAGRAMS
// ---------------------------------------------------------------------------

function getBatchDiagram(batchNum) {
  switch (batchNum) {
    case '00':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 00 VISUAL GUIDE</div>
    <h4>The pin, the extraction, and the name that confuses every reader</h4>
    <p>How the extract was pinned, where it lived, and the RIGGED rename hazard</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '4,147 entries / 3,685 files',
        { text: 'md5 d9c56a29… pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: EXTRACTION', [
        'MAX_PATH: max 140 chars',
        'no limit hit on Windows',
        '3,685 of 3,685 files',
        { text: '0 missing, 0 extra', color: '#059669' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 396, 120, 'STEP 3: THE RENAME HAZARD', [
        'The product was formerly called “rigged”',
        { text: '284 occurrences of RIGGED_* across 85 files', color: '#ef4444' },
        { text: '22 distinct names — but the docs document only 5', color: '#ef4444' },
        { text: 'the residue was never cleaned (the same class as buzz)', color: '#b45309' }
      ])}

      <rect x="20" y="160" width="880" height="140" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
      <text x="40" y="188" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="var(--text-primary, #0f172a)">THE STUDIO PIN</text>
      <text x="40" y="212" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Zip md5 d9c56a297910cbc9055aa39014adf788 · 462 dirs + 3,685 files = 4,147 entries</text>
      <text x="40" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Declared version 0.6.10 — while the README’s install tag still says v0.6.8 (a prose lag)</text>
      <text x="40" y="252" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">ARCHITECTURE.md’s count reconciliation: 94 → 105 migrations; 67 → 69 routes; 87 commands HOLDS; 18 MCP tools HOLDS</text>
      <text x="40" y="278" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#059669">THE COUNT-COROLLARY: a count of a CLOSED surface holds. A count of an OPEN one drifts.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The monorepo — four packages, one boundary, and one client</h4>
    <p>What OpenRig is, measured</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      ${card(20, 20, 210, 150, 'THE 4 PACKAGES', [
        'daemon (private)',
        'cli — THE ONLY PUBLISHED ONE',
        'ui (maintenance mode)',
        'tui (private)',
        '+ test-system',
        { text: '3,685 files total', color: '#059669' }
      ])}
      ${card(250, 20, 210, 150, 'THE BOUNDARY', [
        '22 exports, build-enforced',
        'the boundary is a build rule,',
        'not a convention',
        { text: 'violations fail the build', color: '#059669' },
        { text: 'not a review comment', color: '#059669' }
      ])}
      ${card(480, 20, 210, 150, 'THE DAEMON', [
        'One SQLite file',
        '$OPENRIG_HOME/openrig.sqlite',
        'port 7433',
        '105 migrations (001–109)',
        { text: 'missing 093/100/102/106', color: '#b45309' }
      ])}
      ${card(710, 20, 190, 150, 'THE CLIENTS', [
        'CLI · TUI · web UI · MCP',
        { text: 'every client is ONE', color: '#7c3aed' },
        { text: 'DaemonClient', color: '#7c3aed' },
        'no second transport',
        'no bespoke per-client API'
      ])}

      <rect x="20" y="190" width="880" height="130" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
      <text x="40" y="218" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="var(--text-primary, #0f172a)">THE SURFACES, COUNTED</text>
      <text x="40" y="242" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">69 routes · 87 CLI commands · 18 MCP tools · 5 built-in permission policies · 23 scenario YAMLs</text>
      <text x="40" y="266" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Two frontends: tui = 191 files / 29,473 lines / ZERO .tsx · ui = 538 files / 88,829 lines / 348 .tsx</text>
      <text x="40" y="296" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#7c3aed">THE MAP IS NOT THE TERRITORY — ARCHITECTURE.md says so of itself, and the drift it warns about is real.</text>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE · POLE 1</div>
    <h4>The aissistant — the study’s strongest permission seam</h4>
    <p>The two-surface rule, and why it explains the whole architecture</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 370" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      <rect x="180" y="14" width="560" height="52" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="460" y="36" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#7c3aed">★ THE FOUNDER’S TWO-SURFACE RULE</text>
      <text x="460" y="54" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">“launch flags MAY be deterministic code; config-file policy may NOT”</text>

      <path d="M 300 66 L 300 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      <path d="M 620 66 L 620 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>

      ${card(80, 104, 300, 130, 'SURFACE 1: THE LAUNCH FLAG', [
        'Stable — deterministic code may set it',
        'e.g. --dangerously-skip-permissions',
        { text: 'posture = flag surface', color: '#059669' },
        'yolo · auto live here',
        'resolved by ONE function per harness'
      ])}
      ${card(540, 104, 300, 130, 'SURFACE 2: THE CONFIG FILE', [
        'NOT stable — a vendor may change it',
        { text: 'must go through a SKILL', color: '#b45309' },
        'reads the installed version, adapts',
        'refuses to bypass a stricter rule',
        { text: 'and ships an UNDO', color: '#059669' }
      ])}

      <rect x="80" y="252" width="760" height="104" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
      <text x="100" y="278" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="var(--text-primary, #0f172a)">THE FIVE BUILT-IN POLICIES</text>
      <text x="100" y="302" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">locked (the floor) · standard ⭐ (the study’s cleanest human-in-the-loop default) · open (config surface)</text>
      <text x="100" y="322" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">+ yolo and auto (flag surface) — and the design CONCEDES where its own enforcement is approximate.</text>
      <text x="100" y="344" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#7c3aed">The agent is NOT OpenRig’s — it is an unmodified Claude Code / Codex process in a YAML blueprint.</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE · POLE 2</div>
    <h4>The workspace — a rig, a queue, and the tenancy answer</h4>
    <p>The first platform in the study with NO tenant at all</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      ${card(20, 20, 200, 130, 'THE RIG', [
        'nodes + typed edges',
        'declared in YAML',
        { text: '5 edge kinds', color: '#059669' },
        'a cross-rig trigger',
        'enforced BEFORE INSERT'
      ])}
      ${card(240, 20, 200, 130, 'THE WORKSPACE', [
        'a root + named repos',
        'migrations 038 / 039',
        'the container a person',
        'operates in'
      ])}
      ${card(460, 20, 200, 130, 'THE QUEUE', [
        'durable work',
        'stream_items (intake)',
        'queue_transitions (audit)',
        { text: 'current state is DERIVED', color: '#059669' }
      ])}
      ${card(680, 20, 220, 130, 'THE MIGRATIONS', [
        '105 migrations on disk',
        'docs say 96, ARCHITECTURE',
        'says 94',
        { text: 'three different numbers', color: '#ef4444' },
        { text: 'the doc set disagrees with itself', color: '#ef4444' }
      ])}

      <rect x="20" y="170" width="880" height="170" rx="8" fill="var(--surface-card, #ffffff)" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="198" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#ef4444">★ THE TENANCY ANSWER: THERE IS NONE</text>
      <text x="40" y="224" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">0 tenant_id across 105 migrations. The auth middleware’s own header states the stance:</text>
      <text x="40" y="246" font-family="system-ui, sans-serif" font-size="10.5" fill="#b45309">“single-developer, single-user, single-host … Token holder is fully privileged.”</text>
      <text x="40" y="270" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The tenant boundary, if any, is the MACHINE — loopback or a Tailscale tailnet (“the tailnet is the auth boundary”).</text>
      <text x="40" y="298" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#7c3aed">This makes OpenRig a personal / team-local COCKPIT — not a multi-tenant service.</text>
      <text x="40" y="324" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">For the mapping: the SRS needs its tenancy design justified by other platforms — OpenRig answers it with a clean zero.</text>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE · POLE 3</div>
    <h4>Automations — a queue of obligations that must be carried</h4>
    <p>The hot-potato closure contract and the wake ladder</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      <rect x="20" y="16" width="880" height="54" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="460" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#7c3aed">★ THE HOT-POTATO CLOSURE CONTRACT</text>
      <text x="460" y="56" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">You cannot finish a task without saying where it went</text>

      <path d="M 460 70 L 460 96" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>

      ${card(20, 100, 420, 118, 'state=done REQUIRES one of 7 reasons', [
        'a pure, I/O-free validator owns the rule',
        'and THREE of the reasons additionally',
        { text: 'require a closure_target', color: '#7c3aed' },
        { text: 'handed_off_to · blocked_on · escalation', color: '#7c3aed' },
        { text: '→ NO unit of work can vanish', color: '#059669' }
      ])}
      ${card(480, 100, 420, 118, 'THE TRANSACTIONAL HANDOFF', [
        'the baton AND its wake-intent are staged',
        { text: 'in the SAME transaction', color: '#059669' },
        'delivered after commit',
        'reconciled once at startup',
        { text: 'a crash cannot orphan a handoff', color: '#059669' }
      ])}

      <rect x="20" y="238" width="880" height="128" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.6"/>
      <text x="40" y="266" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#059669">★ THE WAKE LADDER — its invariant, stated in words</text>
      <text x="40" y="292" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">THE ROW CARRIES THE OBLIGATION EXACTLY-ONCE; THE WAKE IS AT-LEAST-ONCE.</text>
      <text x="40" y="316" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">It retries the POINTER, never the content — so a retry cannot double-deliver. State is DERIVED from the transition log,</text>
      <text x="40" y="336" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">so a restart can neither forget a ladder nor restart its counts. A rendered-unconfirmed false negative is treated differently</text>
      <text x="40" y="356" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">from a true failure: it never retries, but escalates directly (escalation cannot double-deliver).</text>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE · PX-W / PX-F</div>
    <h4>Widgets and the frontend — a proven negative, and two first-rate ideas</h4>
    <p>No widget model — but a digital twin and a test-pinned strip invariant</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      <rect x="20" y="16" width="880" height="98" rx="8" fill="var(--surface-card, #ffffff)" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="42" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#ef4444">★ NO WIDGET MODEL — the sixth platform in the study with none</text>
      <text x="40" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Measured: 5 files mention “widget”, and every hit is incidental — Codex’s own source filenames quoted in comments, one test fixture,</text>
      <text x="40" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">and the OMP provider’s own setWidget extension call. 0 WidgetRegistry. 8 “composer” hits — all SERVER-SIDE TEXT composers.</text>
      <text x="40" y="106" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#b45309">The one composition system (Context Packs) composes PROMPTS — atoms, dependencies, profiles — never UI. The tempting near-miss.</text>

      ${card(20, 128, 430, 118, '★ THE DIGITAL-TWIN HARNESS', [
        'The REAL UI + typed fixtures → ONE file',
        'seams: cache-seed · fetch · EventSource',
        { text: 'NOT MSW / no service worker', color: '#475569' },
        { text: '★ typechecked vs the real interfaces', color: '#059669' },
        { text: '→ a real interface change BREAKS the build', color: '#059669' }
      ])}
      ${card(470, 128, 430, 118, '★ THE STRIP INVARIANT (test-pinned)', [
        'layout with NO colour, then a style pass',
        { text: 'stripAnsi(styled[i]) === plain[i]', color: '#7c3aed' },
        { text: 'asserted in 11 test files', color: '#059669' },
        'in the graph: STRUCTURAL — two',
        { text: 'projections of ONE character grid', color: '#059669' }
      ])}

      <rect x="20" y="260" width="880" height="106" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
      <text x="40" y="286" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="var(--text-primary, #0f172a)">TWO FRONTENDS, AND THE PRIMARY ONE IS NOT REACT</text>
      <text x="40" y="310" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">tui: 191 files / 29,473 lines / ZERO .tsx — a HAND-ROLLED ANSI renderer (no Ink, no React), declared as a “Phase-0 substrate decision”</text>
      <text x="40" y="330" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">ui: 538 files / 88,829 lines / 348 .tsx — in MAINTENANCE MODE; the CLI is primary; 687-line globals.css, 54 tokens, Vellum/Black-Glass</text>
      <text x="40" y="352" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#7c3aed">ONE COMMAND REGISTRY makes an undocumented action impossible by construction — a CI parity suite enforces it.</text>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE · PZ</div>
    <h4>Out-of-pole — the gate culture</h4>
    <p>The four-rail exclusion ledger, and a green that carries the load it ran under</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 400" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      <rect x="20" y="16" width="880" height="52" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="460" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#7c3aed">★ “A GREEN IS ONLY AS GOOD AS WHAT COULD HAVE BEEN RED”</text>
      <text x="460" y="56" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The verdict RECORDS per-leg time, ambient load, and the mode it ran in — sealed, not printed</text>

      ${card(20, 82, 210, 104, 'THE MUTEX', [
        'a bound localhost port',
        { text: 'no stale-lock class', color: '#059669' },
        '5 pins; alternatives named',
        { text: 'refuse, never queue', color: '#b45309' }
      ])}
      ${card(248, 82, 210, 104, 'THE SINGLE READ', [
        'read the mode flag ONCE',
        { text: 'two reads can diverge;', color: '#ef4444' },
        { text: 'one cannot', color: '#ef4444' },
        '+ per-leg time = the',
        'independent cross-check'
      ])}
      ${card(476, 82, 210, 104, 'THE GUARDS', [
        '4 guard scripts',
        { text: 'each with a co-located test', color: '#059669' },
        '1 shared rule engine',
        { text: 'a named remedy per finding', color: '#059669' }
      ])}
      ${card(704, 82, 196, 104, 'THE SELF-DESTRUCT', [
        'a bridge with a deletion',
        'contract — and it expired',
        { text: '+ a TOMBSTONE', color: '#059669' },
        { text: '+ a test it STAYS dead', color: '#059669' }
      ])}

      <rect x="20" y="204" width="880" height="180" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.6"/>
      <text x="40" y="232" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#059669">★ THE FOUR-RAIL EXCLUSION LEDGER — a gate that can be green WITH named exceptions</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">RAIL 1 · green-with-exclusions — a covered failure still PASSES the gate, but the resident is NAMED in-band.</text>
      <text x="40" y="282" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">RAIL 2 · mechanical expiry — a resident past its expiry FAILS the gate even if its suite now passes (“self-dying”).</text>
      <text x="40" y="304" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">RAIL 3 · receipt + owner + expiry — mandatory; an invalid ledger is a LOUD failure, never a silent pass.</text>
      <text x="40" y="326" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">RAIL 4 · cut ceiling — no exclusion may expire after the cut. Exceptions cannot rot into permanent exemptions.</text>
      <text x="40" y="352" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#7c3aed">AND IT SHIPS EMPTY, BY DESIGN — “the named-6 were KILLED, not excluded, so main is truly green.”</text>
      <text x="40" y="372" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Establishes the advisory / advisory-but-recorded / enforcing vocabulary — each tier named where it is used.</text>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE · SYNTHESIS</div>
    <h4>The synthesis — where OpenRig sits, and what we take</h4>
    <p>Three tiers of mechanism, the ranked order, and the two measured zeros</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 400" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      ${card(20, 20, 285, 150, 'TIER 1 — ADOPT NOW', [
        '1 · the 4-rail exclusion ledger',
        '2 · green carries the load',
        '3 · single-read + cross-check',
        '4 · self-destruct + tombstone',
        '5 · the strip invariant',
        '6 · guard-as-document',
        { text: '7 · the exact-path exception', color: '#059669' }
      ])}
      ${card(318, 20, 285, 150, 'TIER 2 — WHEN WE BUILD IT', [
        'the digital-twin harness',
        'the permission seam',
        'the one command registry',
        'the 3-tier advisory vocabulary',
        'a named remedy per finding',
        'refusal that teaches',
        { text: 'the declarative surface contract', color: '#7c3aed' }
      ])}
      ${card(616, 20, 284, 150, 'TIER 3 — OBSERVE', [
        'the kernel-released mutex',
        'hermeticity by derivation',
        'the compiled-package probe',
        'layout = authority',
        'the redacted CI summary',
        { text: 'the self-audited doc set', color: '#475569' }
      ])}

      <rect x="20" y="186" width="880" height="96" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="212" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#7c3aed">★ OPENRIG’S ONE STRUCTURAL ANSWER</text>
      <text x="40" y="238" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">“The gate should be as honest as the product.”</text>
      <text x="40" y="262" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Verification machinery is itself a design surface — and the honest version is mostly RECORDS, not checks.</text>

      <rect x="20" y="296" width="880" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="322" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#ef4444">THE TWO MEASURED ZEROS</text>
      <text x="40" y="348" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">NO TENANCY (0 tenant_id) · NO WIDGET MODEL — the two things the mapping turns on, answered with measured zeros.</text>
      <text x="40" y="372" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#059669">Two independent platforms lacking them is the strongest argument we have for building both.</text>
    </svg>
  </div>
</div>`;

    default:
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">VISUAL GUIDE</div>
    <h4>Batch ${batchNum}</h4>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 80" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <text x="460" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-secondary, #475569)">No diagram for this batch yet.</text>
    </svg>
  </div>
</div>`;
  }
}

const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'master', title: 'Executive Topology: a local cockpit with no tenant, and the study’s most transferable gate', category: 'Strategic Architecture',
    description: 'The three poles, the gate culture, the two measured zeros, and the retirement surface.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the extraction, and the RIGGED rename hazard', category: 'Foundations',
    description: 'How the extract was pinned, where it lived, and the 284-occurrence rename residue.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The monorepo — four packages, one boundary, one client', category: 'Foundations',
    description: 'The build-enforced 22-export boundary; every client is one DaemonClient; the count-corollary.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — the two-surface rule', category: 'Pole 1 — The Aissistant',
    description: 'Launch flags may be code; config policy may not. Five policies + a translating skill.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — and the tenancy answer is “none”', category: 'Pole 2 — The Workspace',
    description: 'A rig = nodes + edges; a queue; and the first platform in the study with NO tenant.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — obligations that must be carried', category: 'Pole 3 — Automations',
    description: 'The hot-potato closure contract; the transactional handoff; the wake ladder.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — a proven negative + two ideas', category: 'Cross-Cutting',
    description: 'No widget model; but the digital-twin harness and the test-pinned strip invariant.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole — the gate culture', category: 'Escape Hatch',
    description: 'The bound-port mutex; the single-read flag; the 4-rail exclusion ledger; the self-destruct.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — where OpenRig sits, what we take', category: 'Strategic Decision',
    description: 'Three tiers of mechanism, the ranked order, and the two measured zeros.' }
];

function getAllDiagrams() {
  const map = {};
  map['master'] = { id: 'master', html: getMasterDiagram() };
  ['00', '01', '02', '03', '04', '05', '06', '07'].forEach(num => {
    map[num] = { id: num, html: getBatchDiagram(num) };
  });
  return map;
}

module.exports = {
  getMasterDiagram,
  getBatchDiagram,
  getAllDiagrams,
  DIAGRAMS_CATALOG
};
