// High-precision SVG diagrams for each batch of the n8n Platform Study.
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
// MASTER — Executive topology: the three poles, the first real composition
// surface, and the absences that define where n8n stops.
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>n8n Platform Study Topology: three poles, a composition surface, and the licence line</h4>
    <p>Where each studied mechanism lands, and the boundaries the platform states about itself</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('m')}

      <!-- Outer boundary -->
      <rect x="20" y="20" width="920" height="480" rx="16" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #7c3aed)">n8n 2.44.0 — A FAIR-CODE TYPESCRIPT WORKFLOW-AUTOMATION MONO-REPO</text>
      <text x="45" y="72" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">22,715 .ts files (65 % of all bytes) · 57 @n8n packages · 563 built-in nodes · 32.8 % of files are tests</text>

      <!-- POLE 1 -->
      <g transform="translate(45, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#7c3aed" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">POLE 1 — AISASSISTANT</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">An agent is a configuration</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Built lazily by a fluent API</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 25+ builder methods (b02)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• SKILL.md, 72 KB cap (b02)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• guardrail = allow|stop(code) (b02)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• cost is a guardrail (b02)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#10b981" fill-opacity="0.14"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">Tool output = untrusted input</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">But the tool door's principal</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">is not decided in this layer</text>
      </g>

      <!-- POLE 2 -->
      <g transform="translate(345, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.8"/>
        <rect x="14" y="14" width="108" height="22" rx="4" fill="#2563eb" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#1d4ed8">POLE 2 — WORKSPACE</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A real tenancy model</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">The strongest of the six studied</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Project personal | team (b03)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• membership = a join row (b03)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 10 roles, two-level (b03)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 206 resource:action scopes (b03)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#b45309" fill-opacity="0.14"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b45309">Scopes gate actions, not rows</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">No per-datum read filter — the</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">grain is the action (b03)</text>
      </g>

      <!-- POLE 3 -->
      <g transform="translate(645, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#059669" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">POLE 3 — AUTOMATIONS</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">The best security surface</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A rule at one validated seam</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• isolate pool, scales to 0 (b04)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• zod-validated RPC edge (b04)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• ADR accurate: 65_000 (b04)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• observability = sampling (b04)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">Durable engine is a scaffold</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">The v2 engine's README says so;</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">designed and documented, not shipped</text>
      </g>

      <!-- Bottom band: the verdict -->
      <g transform="translate(45, 370)">
        <rect width="880" height="52" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="18" y="24" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">n8n — A MECHANISM SOURCE AND A COMPOSITION-SURFACE REFERENCE</text>
        <text x="18" y="43" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Take the isolation boundary, the guardrails, the skill contract, the spend cap, the two ratchets, the tenancy vocabulary — and the canvas.</text>
      </g>

      <g transform="translate(45, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">THE LICENCE LINE</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">.ee files are unlicensed (incl. ai-workflow-builder.ee; 4 of 5 scope files). Read to understand, reimplement to use.</text>
      </g>

      <g transform="translate(495, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">THE COMPOSITION SURFACE</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The study's first: a 7-element-type canvas + 129 lint-enforced components + CRDT collaboration.</text>
      </g>
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
    <h4>The pin, the MAX_PATH extraction, and the licence gate</h4>
    <p>How the extract was pinned, where it had to live, and the line that governs every reuse question</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '38,689 entries / 31,629 files',
        { text: 'md5 7cc78a5e… pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: EXTRACTION', [
        'MAX_PATH: 209-char paths',
        'C:\\n8n — verified exact',
        '31,629 of 31,629 files',
        { text: '0 missing, 0 extra', color: '#059669' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 200, 120, 'STEP 3: THE SHAPE', [
        '22,715 .ts / 65 % of bytes',
        '57 @n8n packages',
        'packages/ = 95 % of the tree',
        { text: 'CODE-dominant', color: '#059669' }
      ])}
      <path d="M 704 80 L 742 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(746, 20, 154, 120, 'STEP 4: THE FRAME', [
        'P1 aissistant',
        'P2 workspace',
        'P3 automations',
        { text: '+ PX widgets/front', color: '#059669' }
      ])}
      <rect x="20" y="170" width="880" height="130" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="198" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b91c1c">THE LICENCE GATE — FAIR-CODE, NOT OPEN SOURCE</text>
      <text x="40" y="224" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">n8n ships under the Sustainable Use License. Files under ".ee" are UNLICENSED — including ai-workflow-builder.ee</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">and 4 of the 5 permission-scope files. The readable majority (the isolation boundary, the guardrails, the skill</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">contract, the two ratchets) is what we may learn from; the ".ee" boundary is what we must reimplement.</text>
      <text x="40" y="288" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#b91c1c">Read the architecture, reimplement what is worth having.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The platform overview: two engines, and the honest one is a scaffold</h4>
    <p>What n8n is made of, and the ADR practice that says so in the repo</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      ${card(20, 20, 210, 140, 'THE SHIPPED ENGINE', [
        'packages/core — service-based',
        'a hook registry',
        'a poll manager · routing node',
        'scheduled tasks',
        { text: '+ an external-secrets proxy', color: '#059669' }
      ])}
      <path d="M 230 90 L 268 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(272, 20, 210, 140, 'THE v2 ENGINE', [
        '6 ADRs in the repo',
        'durable execution',
        'token-authorized resume',
        'control/data plane split',
        { text: '"a scaffold … not wired in"', color: '#b45309' }
      ])}
      <path d="M 482 90 L 520 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(524, 20, 180, 140, 'THE NODES', [
        '563 built-in .node.ts',
        '"1,500+" = community',
        'INodeType = description',
        { text: '+ optional behaviours', color: '#059669' }
      ])}
      <path d="M 704 90 L 742 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(746, 20, 154, 140, 'THE CLI', [
        '26 operator commands',
        'audit · db revert',
        'export/import · worker',
        { text: 'one installation', color: '#059669' }
      ])}
      <rect x="20" y="186" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="214" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE ADR PRACTICE — SIX DECISIONS WRITTEN, DATED AND OWNED IN THE REPO</text>
      <text x="40" y="240" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">The v2 engine's own README calls it "a scaffold … not yet wired into n8n" — and the ADRs describe it anyway,</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">including code not yet shipped. One rule travels furthest: "a pause must be a status of the step row;</text>
      <text x="40" y="286" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">it must not be a state of a process." And its "under 65 seconds" is the real 65_000 in code — the ADR is ACCURATE.</text>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE</div>
    <h4>The aissistant: an agent is a configuration, and safety is two questions</h4>
    <p>The builder, the skill contract, and the two primitives that make an agent safe</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      ${card(20, 20, 210, 150, 'THE BUILDER', [
        '@n8n/agents v0.29.0',
        '25+ configuration methods',
        'lazily built — build() is',
        'PROTECTED (user code never',
        { text: 'calls it) — an agent is data', color: '#6d28d9' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(272, 20, 210, 150, 'THE SKILL', [
        'a validated SKILL.md',
        '72 KB output cap',
        'content-hashed linked files',
        'declared MCP dependencies',
        { text: 'the study\u2019s most complete', color: '#059669' }
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(524, 20, 180, 150, 'DELEGATION', [
        'a first-class tool',
        'suspend / resume',
        'a max-children cap',
        { text: '+ a difficulty rating', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(746, 20, 154, 150, 'THE COST STOP', [
        'a SpendLedger',
        'idempotent per callId',
        'a per-session cap',
        { text: '+ a monthly budget', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">TWO PRIMITIVES, TWO MOMENTS</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">1 · a guardrail IS "allow" or "stop(code)"</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">   run BEFORE a model call AND before a tool call</text>
      <text x="38" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">2 · tool output is UNTRUSTED input — invisible</text>
      <text x="38" y="310" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">   Unicode stripped, wrapped with its source</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THE BOUNDARY OF THIS POLE</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">The agent's tools are its tools. Where a tool reaches</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">an MCP server or a platform capability, the IDENTITY</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">it reaches them as is not decided here.</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">The tenancy-aware tool door is the platform's (b03).</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE</div>
    <h4>The workspace: the cleanest tenancy model in the study</h4>
    <p>One container with two modes, membership as a row, and permissions as a vocabulary</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      <rect x="20" y="20" width="880" height="150" rx="12" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#1d4ed8">ONE OBJECT, TWO MODES — Project.type = personal | team</text>
      ${card(40, 60, 200, 96, 'THE CONTAINER', [
        'Project: personal | team',
        'your space & your team\u2019s are',
        { text: 'the SAME object', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(256, 60, 200, 96, 'THE MEMBERSHIP', [
        'a join row (userId, projectId)',
        'carrying a Role by SLUG',
        { text: 'custom role → no migration', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(472, 60, 200, 96, 'THE ROLES', [
        'global (owner/admin/member)',
        '+ resource-level, per thing',
        { text: '2 levels, kept apart', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(688, 60, 200, 96, 'THE IDENTITY', [
        'User + AuthIdentity + ApiKey',
        'one person, several logins',
        { text: 'unique per provider', color: '#059669' }
      ], { stroke: '#2563eb' })}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">206 resource:action SCOPES</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Nothing asks "are you an admin?" — it asks</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"may you do X to this?" A vocabulary, not a question.</text>
      <text x="38" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">4 of the 5 scope files are .ee — read, reimplement.</text>
      <text x="38" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">Sharing reuses membership: a join row + a role.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#b45309" fill-opacity="0.08" stroke="#b45309" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b45309">THE BOUNDARY — ACTIONS, NOT ROWS</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">The scopes gate ACTIONS. Where a ROW-LEVEL read</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">decision is needed, that is a finer grain than the scope</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">vocabulary expresses — a boundary, not a gap.</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b45309">Batch 01's CLI silence: the model is the server's (F03-10).</text>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE</div>
    <h4>Automations: the best security decision is one sentence</h4>
    <p>The isolation boundary, the accurate ADR, and observability as a sampling policy</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      ${card(20, 20, 200, 150, '1 · THE ENGINE', [
        'service-based',
        'a hook registry',
        'a poll manager',
        'scheduled tasks',
        { text: '+ external-secrets proxy', color: '#059669' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(262, 20, 200, 150, '2 · THE ISOLATE POOL', [
        'scales to ZERO when idle',
        'a no-partial-state invariant',
        'two backends: isolated-vm,',
        { text: 'QuickJS behind one bridge', color: '#059669' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(504, 20, 200, 150, '3 · THE RPC EDGE', [
        'zod-validated',
        'every value re-checked',
        { text: '"TS types are erased at', color: '#6d28d9' },
        { text: 'runtime" — the rule', color: '#6d28d9' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(746, 20, 154, 150, '4 · THE WAIT MODEL', [
        'short waits in-process',
        'two sentinel dates',
        'the ADR says 65 s →',
        { text: 'the real 65_000', color: '#059669' }
      ])}
      <rect x="20" y="196" width="880" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="222" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE SENTENCE THE WHOLE STUDY SHOULD REMEMBER</text>
      <text x="40" y="248" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#6d28d9">"TS types are erased at runtime and contribute zero security."</text>
      <text x="40" y="274" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Written at the RPC boundary. Long-lived resumption is authorized by a token on the URL (two kinds, two</text>
      <text x="40" y="294" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">opposite-direction tokens, replay-proof). The human is a node with a rendered form. Observability is a</text>
      <text x="40" y="314" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">sampling policy: three constants decide what is recorded BEFORE anything is recorded.</text>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE</div>
    <h4>Widgets and frontend: THE FIRST REAL COMPOSITION SURFACE</h4>
    <p>A canvas of seven element types, a lint-enforced design system, and CRDT collaboration</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      ${card(20, 20, 200, 150, 'THE SHAPE', [
        '1,351 .vue files',
        'editor-ui + 12 packages',
        'a Vue frontend that is',
        { text: 'a PRODUCT, not a shell', color: '#6d28d9' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(262, 20, 200, 150, 'THE DESIGN SYSTEM', [
        '129 components',
        'documented by tokens',
        'ENFORCED by their own',
        { text: 'ESLint plugin — cannot drift', color: '#059669' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(504, 20, 200, 150, 'THE CANVAS', [
        '7 element types:',
        'nodes · edges · handles',
        'groups · selection',
        { text: 'background · controls', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(746, 20, 154, 150, 'COLLABORATION', [
        'a CRDT layer',
        'on y-websocket',
        'with AWARENESS:',
        { text: 'presence + cursors', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE POSITIVE — A STUDY FIRST</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">This is the FIRST platform in the study with a real</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">widget / composition model. The four closed studies</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">each measured NONE (Paperclip, CrewAI, Multica,</text>
      <text x="38" y="306" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Gas Town). Presence and AI activity are UI.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#b45309" fill-opacity="0.08" stroke="#b45309" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b45309">THE DISTINCTION THAT IS THE FINDING</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">It is NOT a widget composer in the drag-any-element</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">sense. It is a TYPED canvas of workflow elements</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">with a shared editing surface.</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b45309">Third parties author nodes via create-node (declarative).</text>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE</div>
    <h4>Out-of-pole: two ratchets, a pinned harness, and an empty promise</h4>
    <p>The quality gates that can only shrink, and the seam that is a name and not a capability</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      ${card(20, 20, 210, 150, '1 · THE ARCH RATCHET', [
        '299 hashed violations',
        'across 6 rules',
        'a baseline CI can only',
        { text: 'REDUCE — never grow', color: '#059669' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(272, 20, 210, 150, '2 · THE BOUNDARY RATCHET', [
        '110 boundary issues',
        'a second baseline',
        'the retirement rule',
        { text: 'turned into a build gate', color: '#059669' }
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(524, 20, 200, 150, '3 · THE HARNESS', [
        'pinned: harness-v0.6.0',
        'lock-validated',
        'agents as a SUPPLY CHAIN',
        { text: 'agent-check.mjs → excerpt', color: '#059669' }
      ])}
      <path d="M 724 95 L 762 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(766, 20, 134, 150, '4 · THE LICENCE', [
        'a 13-line decorator',
        '@licensed on a route',
        'one registry enforces',
        { text: 'marked, not wrapped', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE POSITIVE — GATES THAT HARDEN</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Two hashed baselines mean architectural debt is</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">MEASURED and can only shrink. The agent harness is</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">pinned and lock-validated; full output goes to disk</text>
      <text x="38" y="306" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">and the agent sees an excerpt, to save its context.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THE NEGATIVE — A NAME, NOT A CAPABILITY</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">packages/extensions/ holds ONE file: .gitkeep, 0 bytes.</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Telemetry is PostHog, ON by default, key hardcoded in</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">source. The batch-00 plan named "extensions" as a PZ</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">subject; batch 06 corrected it by measurement (rule 13).</text>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE</div>
    <h4>The synthesis: fourteen mechanisms, and the five that matter most</h4>
    <p>What to carry forward, and what is ours to build behind the licence line</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      ${card(20, 20, 210, 160, 'TOP 4 — THE SEAMS', [
        '1. the isolation boundary',
        '2. allow|stop(code) ×2',
        '3. the SKILL.md contract',
        { text: '4. cost as a guardrail', color: '#6d28d9' }
      ])}
      <path d="M 230 100 L 268 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(272, 20, 210, 160, 'NEXT — THE MODELS', [
        '5. the accurate ADR practice',
        '6. the two ratchets',
        '7. the tenancy vocabulary',
        { text: '8. the canvas + design system', color: '#6d28d9' }
      ])}
      <path d="M 482 100 L 520 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(524, 20, 180, 160, 'THE PAGE', [
        '22,715 .ts files',
        '65 % of bytes',
        '57 @n8n packages',
        '563 built-in nodes',
        { text: '73 findings', color: '#059669' }
      ])}
      <path d="M 704 100 L 742 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(746, 20, 154, 160, 'THE VERDICT', [
        'mechanism source',
        '+ composition-surface',
        'reference',
        { text: 'behind a licence line', color: '#b45309' }
      ])}
      <rect x="20" y="206" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="234" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE FIVE LOAD-BEARING FINDINGS — if the mapping pass reads only five lines, these are the five</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">F04-03 the zod-validated isolation boundary · F02-05/06 the guardrails + untrusted tool output</text>
      <text x="40" y="282" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">F02-03 the SKILL.md contract · F05-05 the canvas (the study's first composition surface)</text>
      <text x="40" y="312" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">F06-01/02 the two ratchets — and unlike Gas Town's, these are mechanisms with ONE implementation point.</text>
    </svg>
  </div>
</div>`;

    default:
      return '<div class="diagram-wrapper"><p>No diagram for batch ' + batchNum + '.</p></div>';
  }
}

// The catalog drives the dropdown (<optgroup> label = category) and the gallery.
const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'master', title: 'Executive Topology: the three poles, the composition surface, and the licence line', category: 'Strategic Architecture',
    description: 'The three poles, what n8n gives each, and the boundaries the platform states about itself.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the MAX_PATH extraction, and the licence gate', category: 'Foundations',
    description: 'How the extract was pinned, where it had to live, and the fair-code line that governs reuse.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The overview — two engines, one a documented scaffold', category: 'Foundations',
    description: 'A shipped service-based engine, a v2 scaffold with six accurate ADRs, and 563 built-in nodes.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — an agent is a configuration', category: 'Pole 1 — The Aissistant',
    description: 'A lazy fluent builder, the SKILL.md contract, the two guardrails, and cost as a guardrail.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — a real tenancy model', category: 'Pole 2 — The Workspace',
    description: 'Project personal|team, membership as a join row, two-level roles, and 206 action scopes.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — the isolation boundary and an accurate ADR', category: 'Pole 3 — Automations',
    description: 'An isolate pool, a zod-validated RPC edge, the 65_000 ADR, and sampling observability.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — the first composition surface', category: 'Cross-Cutting',
    description: 'A seven-element-type canvas, 129 lint-enforced components, and CRDT collaboration.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole — two ratchets and an empty promise', category: 'Escape Hatch',
    description: '299+110 hashed baselines, a pinned harness, the licence decorator, and an empty extensions dir.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — mechanisms behind a licence line', category: 'Strategic Decision',
    description: '73 findings ranked; the top four are single-seam rules; the verdict and the five load-bearing findings.' }
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
