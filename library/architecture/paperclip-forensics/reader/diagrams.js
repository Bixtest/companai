// High-precision SVG diagrams for each batch of the Paperclip Platform Study.
// Adaptive colours use the reader's CSS custom properties so the diagrams follow
// the active theme (Light / Dark / Sepia / Night) without any JS.
//
// Every diagram is a self-contained string wrapped in the shared markup:
//   <div class="diagram-wrapper"> <div class="diagram-header"> … <div class="diagram-svg-container"> <svg …>
// The generator reads: getMasterDiagram(), getBatchDiagram(n), getAllDiagrams(), DIAGRAMS_CATALOG.

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
      </defs>`;
}

// ---------------------------------------------------------------------------
// MASTER — Executive topology: the three poles, the Hermes engine, and the seam.
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>Paperclip Platform Study Topology: the three poles, the engine, and the seam</h4>
    <p>Where each studied mechanism lands, and where Paperclip must be enclosed by our own tenancy and Hermes integration</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 500" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('m')}

      <!-- Outer boundary: our platform -->
      <rect x="20" y="20" width="920" height="460" rx="16" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #7c3aed)">OUR PLATFORM — MERCATO (multi-tenant AI-company OS)</text>
      <text x="45" y="72" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">Tenant boundary • per-company credentials • the designed seam that encloses Hermes</text>

      <!-- Three poles as columns -->
      <!-- POLE 1 -->
      <g transform="translate(45, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#7c3aed" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">POLE 1 — AISASSISTANT</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">The AI user in the platform</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Versatile • integratable • rich</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 4 separable layers (b02)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Agent lifecycle machine (b02)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Ed25519 identity (b02)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Memory-as-binding (b02)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#f59e0b" fill-opacity="0.15"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b45309">Served by Hermes via the seam</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Two host contexts: workspaces +</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">automations (more in the studio)</text>
      </g>

      <!-- POLE 2 -->
      <g transform="translate(345, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.8"/>
        <rect x="14" y="14" width="108" height="22" rx="4" fill="#2563eb" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#1d4ed8">POLE 2 — WORKSPACE</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">The compatibility surface</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Adapts to mixed use-cases</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Portable md company pkg (b03)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Typed task tree (b03)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Two link types (b03)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Directory restore locks (b03)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#10b981" fill-opacity="0.15"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">Paperclip is a strong foundation</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Widgets &amp; frontend wiring ride on</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">this pole (b05)</text>
      </g>

      <!-- POLE 3 -->
      <g transform="translate(645, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#059669" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">POLE 3 — AUTOMATIONS</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">Agents work on assigned tasks</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Paperclip is the blueprint here</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Runs finite; continuity in DB (b04)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 5 continuation kinds (b04)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Reconciler + DOT-2 loop (b04)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Watchdog + budgets (b04)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#10b981" fill-opacity="0.15"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">Strongest pole — take nearly all</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Heartbeat protocol drives each</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">adapter, incl. the Hermes lane</text>
      </g>

      <!-- Bottom band: the engine + the escape hatch -->
      <g transform="translate(45, 370)">
        <rect width="550" height="90" rx="10" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-width="1.6"/>
        <text x="18" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#047857">HERMES ENGINE (the main AI engine — integrated, never forked)</text>
        <text x="18" y="50" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Reached through ONE typed door. All evolution we need happens on OUR side, then maps onto Hermes.</text>
        <text x="18" y="72" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Paperclip's own adapter contract (11 adapters, b01) is the pattern we reuse — never a second engine.</text>
      </g>

      <g transform="translate(615, 370)">
        <rect width="300" height="90" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
        <text x="16" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">ESCAPE HATCH (PZ) — b06</text>
        <text x="16" y="46" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">MCP governance • OTel + Sentry</text>
        <text x="16" y="62" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Self-development with agents</text>
        <text x="16" y="78" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">In-tree evals • single-tenant crack</text>
      </g>

      <!-- Seam arrows from poles down into the engine -->
      <path d="M 180 350 L 180 368" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" fill="none" marker-end="url(#arr-m)"/>
      <path d="M 480 350 L 480 368" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" fill="none" marker-end="url(#arr-m)"/>
      <path d="M 780 350 L 640 368" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" fill="none" marker-end="url(#arr-m)"/>
    </svg>
  </div>
</div>`;
}

// A small helper to render a titled card of bullet lines inside a batch SVG.
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
    <h4>The pin, the two doc roots, and the study method</h4>
    <p>How the extract was pinned, where the documentation lives, and the 10-rule method that verifies every claim in code</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 300" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '10,447 files extracted',
        { text: 'md5 package.json pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: TWO DOC ROOTS', [
        'doc/ — 375 files (7.56 MB)',
        'docs/ — 78 files (0.53 MB)',
        'All .md: 952 / 12.07 MB',
        { text: 'A caveat, not a defect', color: '#b45309' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 200, 120, 'STEP 3: CODE SCALE', [
        '~1M lines TS / 7,416 files',
        'services/ 535k lines / 1,220 f',
        'tests/ 487k lines / 798 files',
        { text: 'Tests ~48% of the tree', color: '#b45309' }
      ])}
      <path d="M 704 80 L 742 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(746, 20, 154, 120, 'STEP 4: THE FRAME', [
        'P1 aissistant',
        'P2 workspace',
        'P3 automations',
        { text: '+ PX widgets/front', color: '#059669' }
      ])}
      <rect x="20" y="165" width="880" height="115" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="195" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE 10-RULE METHOD — every load-bearing claim is opened in the code, not taken from the docs</text>
      <text x="40" y="220" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 1–4: pin first · measure before claiming · quote file+line · separate the docs' word from the code's word.</text>
      <text x="40" y="240" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 5–7: name the pole · mark what fits · mark what does NOT fit and why.</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 8–10: record divergences · keep it additive across studies · end on a ranked recommendation.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The core model, the heartbeat protocol, and the adapter ring</h4>
    <p>Company → projects → milestones → issues, held together by one callable contract and eleven adapters</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      <rect x="20" y="20" width="880" height="70" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
      <text x="40" y="48" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="var(--text-primary, #0f172a)">Company (no standalone goal — direction comes from Initiatives)</text>
      <text x="40" y="72" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Projects → Milestones → Issues → Sub-issues. The Board is the single human operator (V1); hires and strategy are Board-gated.</text>

      <g transform="translate(20, 110)">
        <rect width="270" height="190" rx="10" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#1d4ed8">HEARTBEAT = A PROTOCOL</text>
        <text x="16" y="54" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Three methods only:</text>
        <text x="16" y="76" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• invoke(…) — start a turn</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• status(…) — read state</text>
        <text x="16" y="116" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• cancel(…) — stop a run</text>
        <rect x="16" y="134" width="238" height="42" rx="6" fill="#10b981" fill-opacity="0.12"/>
        <text x="24" y="152" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#059669">MINIMUM CONTRACT</text>
        <text x="24" y="168" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">"Be callable." Nothing more is required.</text>
      </g>

      <g transform="translate(310, 110)">
        <rect width="270" height="190" rx="10" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">11 ADAPTERS</text>
        <text x="16" y="54" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">One registry, one interface:</text>
        <text x="16" y="76" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• native / cli / container kinds</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• … incl. hermes + hermes-gateway</text>
        <rect x="16" y="114" width="238" height="62" rx="6" fill="#7c3aed" fill-opacity="0.10"/>
        <text x="24" y="132" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">WHY THIS MATTERS TO US</text>
        <text x="24" y="148" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Paperclip already treats "the engine" as</text>
        <text x="24" y="164" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">an adapter — the same seam we need.</text>
      </g>

      <g transform="translate(600, 110)">
        <rect width="300" height="190" rx="10" fill="var(--surface-card, #ffffff)" stroke="#b45309" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b45309">WHAT IT DOES *NOT* HAVE</text>
        <text x="16" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• No chat bus — tasks + comments</text>
        <text x="16" y="74" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Single-tenant by design (b01 §3)</text>
        <text x="16" y="94" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• No goal field on the company</text>
        <text x="16" y="114" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Cost is tracked per agent/task/etc.</text>
        <rect x="16" y="134" width="268" height="42" rx="6" fill="#f59e0b" fill-opacity="0.14"/>
        <text x="24" y="152" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#b45309">OUR SEAM ADDS THE TENANT WALL</text>
        <text x="24" y="168" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Paperclip never needed one — we do.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE — POLE 1</div>
    <h4>The aissistant: four separable layers and a real lifecycle machine</h4>
    <p>Body, soul, identity and permissions are independent — so each can be upgraded or swapped without touching the others</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      ${card(20, 20, 210, 150, '1 · BODY (ADAPTER)', [
        'How the agent is called',
        'native · cli · container',
        'Swappable per agent',
        { text: '= the runtime stance', color: '#6d28d9' }
      ])}
      ${card(245, 20, 210, 150, '2 · SOUL (FILES)', [
        'AGENTS.md + notes',
        'Persistent across runs',
        'Plain files, git-friendly',
        { text: 'Not a DB blob', color: '#059669' }
      ])}
      ${card(470, 20, 210, 150, '3 · IDENTITY', [
        'Ed25519 keypair',
        'Generated per agent',
        'agent_seal proof',
        { text: 'routes/agents.ts', color: '#1d4ed8' }
      ])}
      ${card(695, 20, 205, 150, '4 · PERMISSIONS', [
        'Explicit allow-list',
        'Sandbox escape NEVER default',
        'Revocation is permanent',
        { text: 'fail-closed', color: '#b45309' }
      ])}

      <rect x="20" y="190" width="880" height="130" rx="10" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="218" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE AGENT-LIFECYCLE STATE MACHINE (not a boolean)</text>
      <g font-family="system-ui, sans-serif" font-size="11" font-weight="600">
        <rect x="40" y="236" width="118" height="30" rx="15" fill="#f59e0b" fill-opacity="0.16" stroke="#f59e0b"/>
        <text x="58" y="256" fill="#b45309">pending_approval</text>
        <rect x="188" y="236" width="96" height="30" rx="15" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
        <text x="214" y="256" fill="#1d4ed8">preparing</text>
        <rect x="314" y="236" width="92" height="30" rx="15" fill="#3b82f6" fill-opacity="0.14" stroke="#3b82f6"/>
        <text x="338" y="256" fill="#1d4ed8">verifying</text>
        <rect x="436" y="236" width="86" height="30" rx="15" fill="#10b981" fill-opacity="0.16" stroke="#10b981"/>
        <text x="466" y="256" fill="#059669">ready</text>
        <rect x="552" y="236" width="104" height="30" rx="15" fill="#8b5cf6" fill-opacity="0.14" stroke="#8b5cf6"/>
        <text x="574" y="256" fill="#6d28d9">pause/resume</text>
        <rect x="686" y="236" width="96" height="30" rx="15" fill="#ef4444" fill-opacity="0.14" stroke="#ef4444"/>
        <text x="714" y="256" fill="#b91c1c">terminate</text>
      </g>
      <text x="40" y="298" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A hire must pass an eval gate before it ever reaches "ready" — the same discipline we want for a provisioned Hermes home.</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE — POLE 2</div>
    <h4>The workspace: a company as a portable markdown package</h4>
    <p>The whole company travels as files — markdown is canonical, git is the container, slugs are the identity</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 330" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      <g transform="translate(20, 20)">
        <rect width="300" height="230" rx="10" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#1d4ed8">THE PACKAGE (agentcompanies/v1)</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">COMPANY.md    — the company</text>
        <text x="16" y="76" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">TEAM.md       — who is on the team</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">AGENTS.md     — each agent's soul</text>
        <text x="16" y="116" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">PROJECT.md    — a project</text>
        <text x="16" y="136" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">TASK.md       — a task</text>
        <text x="16" y="156" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">SKILL.md      — a company skill</text>
        <text x="16" y="176" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">.paperclip.yaml — machine config</text>
        <rect x="16" y="190" width="268" height="24" rx="4" fill="#10b981" fill-opacity="0.14"/>
        <text x="24" y="207" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#059669">Markdown canonical • slugs = identity</text>
      </g>

      <g transform="translate(340, 20)">
        <rect width="270" height="230" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="var(--text-primary, #0f172a)">THE TYPED TASK TREE</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">A finite state machine per task:</text>
        <text x="16" y="78" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">open → in_progress → blocked</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">→ in_review → done / cancelled</text>
        <text x="16" y="122" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#1d4ed8">TWO LINK TYPES (kept apart):</text>
        <text x="16" y="142" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• hierarchy — parent / child</text>
        <text x="16" y="160" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• blockers — must-finish-first</text>
        <rect x="16" y="176" width="238" height="40" rx="6" fill="#7c3aed" fill-opacity="0.10"/>
        <text x="24" y="194" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">Mix them and you get deadlocks.</text>
        <text x="24" y="210" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Paperclip keeps them separate.</text>
      </g>

      <g transform="translate(630, 20)">
        <rect width="270" height="230" rx="10" fill="var(--surface-card, #ffffff)" stroke="#b45309" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b45309">CONCURRENCY DISCIPLINE</text>
        <text x="16" y="58" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Directory-level restore locks:</text>
        <text x="16" y="80" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• SQLite BEGIN IMMEDIATE</text>
        <text x="16" y="98" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• 30-second hold</text>
        <text x="16" y="116" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• fail-closed on contention</text>
        <rect x="16" y="134" width="238" height="78" rx="6" fill="#f59e0b" fill-opacity="0.12"/>
        <text x="24" y="154" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#b45309">WHY THIS IS RARE</text>
        <text x="24" y="172" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Most systems let two restores</text>
        <text x="24" y="188" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">run at once and corrupt the tree.</text>
        <text x="24" y="204" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Paperclip refuses instead.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE — POLE 3</div>
    <h4>Automations: runs are finite, continuity lives in the database</h4>
    <p>The single law that makes long-running agent work survivable — plus the reconciler, the DOT-2 loop and the watchdog</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      <rect x="20" y="20" width="880" height="58" rx="10" fill="#059669" fill-opacity="0.10" stroke="#059669" stroke-width="1.6"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-size="13.5" font-weight="700" fill="#047857">CORE LAW: a run is FINITE. Continuity is NOT a live process — it is a row in the database.</text>
      <text x="40" y="66" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Processes die. Rows survive. The system can always ask "what was I doing?" because it wrote it down.</text>

      ${card(20, 95, 285, 160, 'THE THREE-WAY INVARIANT', [
        '1 · live path — something is running',
        '2 · durable wait — a row awaits a wake',
        '3 · visible disposition — a human can see',
        { text: 'Break one and work vanishes.', color: '#b45309' }
      ])}
      ${card(320, 95, 285, 160, 'FIVE CONTINUATION KINDS', [
        '• same_agent — keep going',
        '• retry — try again',
        '• delegated_issue — hand off',
        '• response_wake — a reply arrives',
        { text: '• monitor — watch + wake', color: '#6d28d9' }
      ], { sw: 1.6, stroke: '#7c3aed', titleColor: '#6d28d9' })}
      ${card(620, 95, 280, 160, 'IDEMPOTENCY KEYS', [
        'Each continuation carries a key.',
        'Fire it twice → one effect.',
        'This is what stops double-charges',
        { text: 'and double-work on retries.', color: '#059669' }
      ], { sw: 1.6, stroke: '#10b981', titleColor: '#047857' })}

      <g transform="translate(20, 275)">
        <rect width="430" height="70" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
        <text x="16" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">THE RECONCILER — reconcileStrandedAssignedIssues()</text>
        <text x="16" y="48" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A task assigned to an agent that died mid-run must not stay stuck forever.</text>
        <text x="16" y="62" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">The reconciler notices and re-opens it — the safety net under the core law.</text>
      </g>

      <g transform="translate(470, 275)">
        <rect width="430" height="70" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="16" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">THE DOT-2 LOOP — a documented real production bug</text>
        <text x="16" y="48" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">The poller was slowed to "fix" a race. The true fix: correct the CONTRACT.</text>
        <text x="16" y="62" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"Fix the contract, never slow the poller." A rare, honest artefact.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE — WIDGETS &amp; FRONTEND</div>
    <h4>One token source, a mechanical gate, and a written decision memory</h4>
    <p>Paperclip makes design decisions that cannot silently rot — and stops exactly at the widget-composer boundary</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 330" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      ${card(20, 20, 285, 150, 'ONE TOKEN SOURCE', [
        'ui/src/index.css',
        'Tailwind v4 · @theme inline',
        'Baked at BUILD time',
        { text: 'Change once → everywhere', color: '#059669' }
      ])}
      ${card(320, 20, 285, 150, 'MECHANICAL TOKEN GATE', [
        'check:token-gates command',
        'Fails the build on a raw value',
        'Not a review convention — a gate',
        { text: 'Cannot be forgotten', color: '#1d4ed8' }
      ], { sw: 1.6, stroke: '#2563eb', titleColor: '#1d4ed8' })}
      ${card(620, 20, 280, 150, '510-IMAGE BASELINE', [
        '255 stories × light + dark',
        'Visual diffs are reviewed',
        'A layout break is caught, not felt',
        { text: 'Regression = red image', color: '#b45309' }
      ], { sw: 1.6, stroke: '#f59e0b', titleColor: '#b45309' })}

      <g transform="translate(20, 190)">
        <rect width="540" height="125" rx="10" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="16" y="28" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">THE DECISION SHEET — written memory for design</text>
        <text x="16" y="52" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Every UI choice is recorded with its reason, in a sheet the team actually reads.</text>
        <text x="16" y="74" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Newcomers inherit WHY, not just WHAT — the same discipline this study itself follows.</text>
        <rect x="16" y="88" width="508" height="26" rx="5" fill="#10b981" fill-opacity="0.12"/>
        <text x="24" y="105" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#059669">Also: an in-app DesignGuide so the pattern is discoverable while building.</text>
      </g>

      <g transform="translate(580, 190)">
        <rect width="320" height="125" rx="10" fill="#ef4444" fill-opacity="0.07" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="28" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THE BOUNDARY: no widget composer</text>
        <text x="16" y="52" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Paperclip has components and pages, but no</text>
        <text x="16" y="70" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">general widget system an end-user can compose.</text>
        <text x="16" y="94" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Our widgets architecture must be built — the</text>
        <text x="16" y="112" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">token discipline here is the part we adopt.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE — ESCAPE HATCH (PZ)</div>
    <h4>Out-of-pole findings that still change how we build</h4>
    <p>Governance, observability, self-development and the single-tenant wall cracking at the edges</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      ${card(20, 20, 210, 150, 'MCP GOVERNANCE', [
        'Risk levels per tool',
        'Writes quarantined first',
        'Disable preserves the audit',
        { text: 'A model for our MCP door', color: '#1d4ed8' }
      ])}
      ${card(245, 20, 210, 150, 'OBSERVABILITY', [
        'OpenTelemetry spans',
        'Two-project Sentry split',
        'Every agent turn is traceable',
        { text: 'Debug-by-trace, not guess', color: '#059669' }
      ])}
      ${card(470, 20, 210, 150, 'SELF-DEVELOPMENT', [
        'Scoped .mdc rules + AGENTS.md',
        '31 first-party dev skills',
        'The platform builds itself',
        { text: 'Powerful — and a risk', color: '#6d28d9' }
      ])}
      ${card(695, 20, 205, 150, 'IN-TREE EVALS', [
        'Evals live beside the code',
        'Run in CI, not a side tool',
        'Quality is enforced, not hoped',
        { text: 'Take this wholesale', color: '#059669' }
      ])}

      <rect x="20" y="190" width="880" height="120" rx="10" fill="#ef4444" fill-opacity="0.07" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="218" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b91c1c">THE HONEST LIMIT: the single-tenant wall cracks at the edges</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Paperclip is single-tenant by design. Where it meets cloud + customer-success surfaces, the wall needs patching —</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">and it is patched with fail-closed environment flags rather than a true tenancy layer. Our platform must supply that layer.</text>
      <text x="40" y="290" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#b91c1c">This is the single most important out-of-pole finding for our seam design.</text>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE — STRATEGIC DECISION</div>
    <h4>The synthesis: what to take, what to guard, and the four forks against Hermes</h4>
    <p>The transfer matrix that closes the Paperclip study and feeds the coming cross-platform mapping step</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      <g transform="translate(20, 20)">
        <rect width="430" height="150" rx="10" fill="#10b981" fill-opacity="0.09" stroke="#10b981" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#047857">★ TAKE — ranked mechanisms</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">1 · The finite-run / durable-continuity law (P3)</text>
        <text x="16" y="74" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">2 · The typed task tree with two link types (P2)</text>
        <text x="16" y="92" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">3 · The agent-lifecycle state machine (P1)</text>
        <text x="16" y="110" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">4 · The portable markdown company package (P2)</text>
        <text x="16" y="128" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">5 · The reconciler + idempotency keys (P3)</text>
        <text x="16" y="146" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">… 12 ranked mechanisms in total (§3 of the synthesis)</text>
      </g>

      <g transform="translate(470, 20)">
        <rect width="430" height="150" rx="10" fill="#ef4444" fill-opacity="0.07" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b91c1c">✗ DO NOT ASSUME — it does not give us</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Multi-tenancy — single-tenant by design</text>
        <text x="16" y="74" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A widget composer — components only</text>
        <text x="16" y="92" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A rich persona / memory layer — thin</text>
        <text x="16" y="110" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A final SPEC — the docs are a draft</text>
        <text x="16" y="128" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A chat bus — it chose tasks + comments</text>
        <text x="16" y="146" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Each gap is OUR work, not a hidden feature.</text>
      </g>

      <rect x="20" y="190" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="218" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE FOUR CROSS-STUDY FORKS vs HERMES — where each side draws the boundary</text>
      <text x="40" y="246" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Paperclip draws every boundary LOWER (it delegates persona, memory, runtime stance and tenancy).</text>
      <text x="40" y="266" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Hermes draws every boundary HIGHER (it owns persona, memory, runtime stance). Neither is wrong — they are different bets.</text>
      <text x="40" y="292" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">Our seam must decide, per boundary, which side wins — and Hermes wins where it is already stronger.</text>
    </svg>
  </div>
</div>`;

    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// CATALOG — drives the gallery grid and the in-document dropdown.
// `category` becomes the optgroup label; `batchNum` is the target document.
// ---------------------------------------------------------------------------
const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'all', title: 'Executive Topology: the three poles, the engine, and the seam', category: 'Strategic Architecture', description: 'The three poles, the Hermes engine below them, and the escape hatch — the whole study on one page.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the two doc roots, and the method', category: 'Foundations', description: 'An extract not a clone, the two documentation roots, the code scale, and the 10-rule method.' },
  { id: '01', batchNum: '01', title: 'Batch 01: Core model, heartbeat protocol & adapter ring', category: 'Foundations', description: 'Company → projects → milestones → issues, the three-method heartbeat, and the 11 adapters.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — four layers & lifecycle', category: 'Pole 1 — The Aissistant', description: 'Body, soul, identity, permissions — plus the real agent-lifecycle state machine and its eval gate.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — portable markdown company', category: 'Pole 2 — The Workspace', description: 'The agentcompanies/v1 package, the typed task tree with two link types, and directory restore locks.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — finite runs, durable continuity', category: 'Pole 3 — Automations', description: 'The core law, the three-way invariant, five continuation kinds, the reconciler and the DOT-2 loop.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — tokens, gate, baseline', category: 'Cross-Cutting', description: 'One token source, the mechanical token gate, the 510-image baseline, and the no-composer boundary.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole (PZ) — governance & the tenancy crack', category: 'Escape Hatch', description: 'MCP governance, observability, self-development, evals, and where the single-tenant wall cracks.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — transfer matrix & four forks', category: 'Strategic Decision', description: 'What to take, what it does not give us, and the four boundary forks against Hermes.' }
];

function getAllDiagrams() {
  const map = {
    'master': { id: 'master', html: getMasterDiagram() }
  };
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
