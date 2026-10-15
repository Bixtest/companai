// High-precision SVG diagrams for each batch of the Multica Platform Study.
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
// MASTER — Executive topology: the three poles, what Multica gives each, and
// the two things an AI-company OS needs that Multica does not have at any layer
// (a composition layer, and an engine of its own).
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>Multica Platform Study Topology: three poles implemented, and two absent layers</h4>
    <p>Where each studied mechanism lands, and the two things an AI-company OS needs that Multica does not have at any layer</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('m')}

      <!-- Outer boundary -->
      <rect x="20" y="20" width="920" height="480" rx="16" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #7c3aed)">MULTICA 0.2.0 — A MULTI-SURFACE PRODUCT (Go server + daemon + web/desktop/mobile)</text>
      <text x="45" y="72" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">The tenant boundary is in the schema: 82 of 144 tables carry workspace_id • the runtime fence is a task-scoped credential</text>

      <!-- POLE 1 -->
      <g transform="translate(45, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#7c3aed" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">POLE 1 — AISASSISTANT</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A stored teammate + a machine</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">One engine seam, many providers</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• agent_runtime + agent split (b02)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 1 Backend, 24 structs / 25 keys (b02)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• config stored runtime-native (b02)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• deny-by-default invocation (b02)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">No engine of its own — it drives CLIs</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">The runtime is a third-party agent</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">behind a per-provider adapter</text>
      </g>

      <!-- POLE 2 -->
      <g transform="translate(345, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.8"/>
        <rect x="14" y="14" width="108" height="22" rx="4" fill="#2563eb" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#1d4ed8">POLE 2 — WORKSPACE</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A fenced tenant, in the schema</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">82 of 144 tables carry workspace_id</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 3 roles, last owner protected (b03)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 32-col issue + 2 field layers (b03)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• projects led by member OR agent (b03)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Git: registry + install + PR join (b03)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">No composition layer — no widgets</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Pages are fixed; the user does not</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">arrange the surface out of parts</text>
      </g>

      <!-- POLE 3 -->
      <g transform="translate(645, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#059669" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">POLE 3 — AUTOMATIONS</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A real delivery layer</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Work arrives; machines are assumed dead</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• one-statement claim (b04)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• leases + 4 named sweepers (b04)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• row-as-lease scheduler (b04)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 27-value failure taxonomy (b04)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#10b981" fill-opacity="0.14"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">The layer CrewAI was measured to lack</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Queue, claim, lease, sweep, schedule,</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">retry, attribute — all present</text>
      </g>

      <!-- Bottom band: the verdict -->
      <g transform="translate(45, 370)">
        <rect width="880" height="52" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="18" y="24" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">MULTICA 0.2.0 — BOTH AN ARCHITECTURE REFERENCE AND A MECHANISM SOURCE FOR THE THREE POLES</text>
        <text x="18" y="43" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Take the machine/teammate split, the one-statement claim, the row-as-lease scheduler, the invocation model, the frontend layering.</text>
      </g>

      <g transform="translate(45, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">ABSENT LAYER 1 — COMPOSITION</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">No widget model exists at all: 0 composers, "widget" in 13 incidental files (b05).</text>
      </g>

      <g transform="translate(495, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">ABSENT LAYER 2 — AN OWN ENGINE</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Multica runs adapters over third-party CLIs; it owns no model loop. Both are BUILD.</text>
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
    <h4>The pin, the code-dominant shape, and the study method</h4>
    <p>How the extract was pinned, why the hazard here is the opposite of CrewAI's, and the 10-rule method that verifies every claim in code</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '7,013 entries / 6,539 files',
        { text: 'md5 30ddc64a… pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: THE SHAPE', [
        'server/ 2,036 Go / 801,066 lines',
        'packages/ 1,784 / 402,307',
        'apps/ 682 / 97,262',
        { text: 'CODE-dominant, not docs', color: '#059669' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 200, 120, 'STEP 3: THE HAZARD', [
        'The README describes OUR vision',
        'Similarity invites assumption',
        'Docs are small AND persuasive',
        { text: 'Rule 1 bites hardest here', color: '#b45309' }
      ])}
      <path d="M 704 80 L 742 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(746, 20, 154, 120, 'STEP 4: THE FRAME', [
        'P1 aissistant',
        'P2 workspace',
        'P3 automations',
        { text: '+ PX widgets/front', color: '#059669' }
      ])}
      <rect x="20" y="170" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="198" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE 10-RULE METHOD — every load-bearing claim is opened in the code, never taken from the docs</text>
      <text x="40" y="224" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 1–4: pin first · measure before claiming · quote file+line · the code wins any disagreement.</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 5–7: name the pole · mark what fits · name every capability, including the ones we will not use.</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 8–10: record divergences · keep it additive across studies · run the retirement rule on 598 migrations.</text>
      <text x="40" y="288" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">Rule 10 is richest here: a silently-removed feature is the most valuable kind of finding.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The control plane: a server, a daemon, and one board</h4>
    <p>What Multica is made of, and the three mechanisms that make the poles possible</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      ${card(20, 20, 210, 140, 'THE SURFACES', [
        'server/ — Go backend (Chi, sqlc)',
        'daemon/ — the local exec plane',
        'apps/web — Next.js 16',
        'apps/desktop — Electron',
        { text: 'apps/mobile — Expo (independent)', color: '#1d4ed8' }
      ])}
      <path d="M 230 90 L 268 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(272, 20, 210, 140, 'THE QUEUE', [
        'agent_task_queue — a real table',
        'status: queued→dispatched→running',
        '…→completed | failed | cancelled',
        'priority + created_at ordering',
        { text: 'FOR UPDATE SKIP LOCKED claim', color: '#059669' }
      ])}
      <path d="M 482 90 L 520 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(524, 20, 180, 140, 'THE CRON', [
        'sys_cron_executions',
        'row = lease AND audit log',
        'unique (job, scope, plan_time)',
        'lease_token guards writes',
        { text: 'no materialised STALE', color: '#059669' }
      ])}
      <path d="M 704 90 L 742 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(746, 20, 154, 140, 'THE FENCE', [
        'workspace = tenant root',
        'mat_ task token scopes a run',
        '82/144 tables carry ws_id',
        { text: 'one runtime, many agents', color: '#059669' }
      ])}
      <rect x="20" y="186" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="214" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE HEADLINE — the machine / teammate split (004_agent_runtime_loop.up.sql:1-18)</text>
      <text x="40" y="240" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">agent_runtime is THE MACHINE: (workspace, daemon, provider, online/offline, last_seen_at), UNIQUE (workspace_id, daemon_id, provider).</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">agent is THE TEAMMATE: a stored colleague, bound by agent.runtime_id NOT NULL … ON DELETE RESTRICT (:70-73).</text>
      <text x="40" y="286" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">One engine instance, many colleagues — the primitive a tenant needs, and the strongest finding of the study.</text>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE</div>
    <h4>The aissistant: a stored teammate, a machine, and one engine seam</h4>
    <p>What an agent is, what runs it, how it is configured, and who may make it run</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      ${card(20, 20, 210, 150, 'THE MACHINE', [
        'agent_runtime',
        'workspace · daemon · provider',
        'status: online | offline',
        'last_seen_at → the health gate',
        { text: 'UNIQUE (ws, daemon, provider)', color: '#6d28d9' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(272, 20, 210, 150, 'THE TEAMMATE', [
        'agent — 29 columns',
        'runtime_id NOT NULL RESTRICT',
        'model / thinking / service_tier',
        'instructions · custom_env/args',
        { text: 'runtime-native, not neutralised', color: '#b45309' }
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(524, 20, 180, 150, 'THE SEAM', [
        'Backend interface',
        'Execute(ctx, prompt, opts)',
        '24 structs / 25 provider keys',
        'SupportedTypes = closed list',
        { text: 'kept in lockstep w/ DB CHECK', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(746, 20, 154, 150, 'WHO MAY RUN', [
        'permission_mode',
        'private | public_to',
        'agent_invocation_target',
        'workspace | member | team',
        { text: 'deny-by-default', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">THE INVOCATION GATE (agent_access.go:73-133)</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">1. the owner may always invoke their own agent</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">2. if not public_to → FALSE (no admin bypass, no A2A bypass)</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">3. else walk the targets and OR-match them</text>
      <text x="38" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">A2A is judged by the top-of-chain HUMAN originator.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">WHAT IT DOES NOT HAVE</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• an engine of its own — the provider is a third-party CLI</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• a live team concept — the team target is stored but inert</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• one unified execution model — 24 adapters, not one loop</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">The seam is real; the engine behind it is not Multica's.</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE</div>
    <h4>The workspace: a fenced tenant, and the work that lives in it</h4>
    <p>82 of 144 tables carry workspace_id; members, issues, projects and the code link sit inside the fence</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      <rect x="20" y="20" width="880" height="150" rx="12" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#1d4ed8">THE TENANT FENCE — 144 tables, 82 carry workspace_id</text>
      ${card(40, 60, 200, 96, 'MEMBERS', [
        'owner | admin | member',
        'invitations: 7-day expiry',
        { text: 'last owner protected (x3)', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(256, 60, 200, 96, 'ISSUES', [
        '32 columns',
        'number · stage · triage_state',
        { text: 'metadata + typed properties', color: '#b45309' }
      ], { stroke: '#2563eb' })}
      ${card(472, 60, 200, 96, 'PROJECTS', [
        'status · priority · dates',
        'lead: member OR agent',
        { text: 'polymorphic resources', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(688, 60, 200, 96, 'CODE', [
        'workspace.repos (url + ref)',
        'github_installation (multi-ws)',
        { text: 'issue ↔ PR join', color: '#059669' }
      ], { stroke: '#2563eb' })}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#2563eb" fill-opacity="0.08" stroke="#2563eb" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#1d4ed8">TWO CUSTOM-FIELD LAYERS, DELIBERATELY SPLIT</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">issue.metadata (105) — a free jsonb bag for MACHINES, 8 KB, primitives</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">issue_property + issue.properties (191) — a TYPED catalog for PEOPLE, 16 KB</text>
      <text x="38" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">values are keyed by definition UUID, so a rename never rewrites data</text>
      <text x="38" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#1d4ed8">Definitions are archived, never deleted — history stays resolvable.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THREE DESIGN DECISIONS RECORDED IN MIGRATIONS</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• triage moved OFF status onto its own column (483)</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• a duplicate is a cancelled issue with a pointer (536)</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• stages are barrier groups among siblings (123)</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">The migration chain, not the schema, is the durable truth.</text>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE</div>
    <h4>Automations: the delivery layer</h4>
    <p>A one-statement claim, leases, named sweepers, a row-as-lease scheduler, and a failure taxonomy</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      ${card(20, 20, 210, 150, '1 · THE CLAIM', [
        'UPDATE … WHERE id = (',
        '  SELECT … WHERE status=queued',
        '  ORDER BY priority, created, id',
        '  LIMIT 1',
        { text: '  FOR UPDATE SKIP LOCKED)', color: '#059669' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(272, 20, 210, 150, '2 · THE LEASE', [
        'prepare_lease_expires_at (124)',
        'bounds dispatched→never-started',
        'attempt / max_attempts (055)',
        'parent_task_id — a retry chain',
        { text: 'last_heartbeat_at', color: '#059669' }
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(524, 20, 180, 150, '3 · THE SWEEPERS', [
        'ExpireStaleQueuedTasks',
        'FailStaleTasks',
        'FailTasksForOfflineRuntimes',
        'FailExpiredRuntimeReconnects',
        { text: 'RecoverOrphanedTasks…', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(746, 20, 154, 150, '4 · THE SCHEDULER', [
        'sys_cron_executions',
        'row = lease + audit',
        'lease_token',
        'catch-up per job',
        { text: 'no materialised STALE', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE CLAIM'S THREE RULES</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">1. a TOTAL order — priority DESC, created_at ASC, id ASC</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">2. per-work-item serialization — one agent never double-runs</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">3. the runtime-health gate INSIDE the claim</text>
      <text x="38" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">A task is never handed to a machine the platform believes is gone.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">THE FAILURE TAXONOMY — 27 VALUES</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">13 platform-side (no prefix): queued_expired, runtime_offline, timeout, …</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">14 agent-side, all prefixed agent_error. — produced by Classify(rawError)</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">IsAgentError is then a STRING PREFIX check, not a list</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">"Whose fault is this?" became a string operation.</text>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE</div>
    <h4>Widgets and frontend: a shared-first architecture, and no widget model</h4>
    <p>A strict layering whose rules are prohibitions, named adapters, a role-named token system — and a measured absence</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      ${card(20, 20, 200, 150, 'THE SHARED LAYER', [
        'packages/views — 304,348 lines',
        'packages/core — 86,914 lines',
        'packages/ui — 10,689 lines',
        '  46 primitives',
        { text: '≈402k shared vs ≈60k apps', color: '#6d28d9' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(262, 20, 200, 150, 'THE PROHIBITIONS', [
        'core: no react-dom',
        'core: no localStorage → StorageAdapter',
        'core: no process.env',
        'ui: no @multica/core imports',
        { text: 'views: no stores/next/router', color: '#b45309' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(504, 20, 180, 150, 'THE ADAPTERS', [
        'StorageAdapter',
        'NavigationAdapter',
        'useNavigation()',
        '<AppLink>',
        { text: 'WindowOverlay (desktop)', color: '#059669' }
      ])}
      <path d="M 684 95 L 722 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(726, 20, 174, 150, 'THE TOKENS', [
        'role-named type scale',
        '51 ad-hoc sizes → 10 steps',
        'surface system',
        'colors pinned by WCAG',
        { text: 'UI Lab proves contrast', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THE NEGATIVE: NO WIDGET / COMPOSER MODEL</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">0 composers found anywhere in the tree</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"widget" appears in 13 code files — all incidental</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">the UI is composed of fixed pages and business components</text>
      <text x="38" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">Second platform with no widget architecture (Paperclip had none).</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">TWO RULES WORTH CARRYING</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• TanStack Query owns server data; Zustand owns client state</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• only auth/workspace stores may call api.* directly</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• optimistic updates need 4 conditions (predictable, rare, …)</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">UI JSON is validated (zod + parseWithFallback), never cast.</text>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE</div>
    <h4>Out-of-pole: the perimeter, the plugin reset, and the patterns that repeat</h4>
    <p>Everything that serves the vision but none of the three poles directly</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      ${card(20, 20, 200, 150, 'THE PERIMETER', [
        'auth: jwt/session/cookie/PAT',
        'membership + PAT + daemon caches',
        'middleware: workspace, CSP',
        'plugin_ratelimit (separate)',
        { text: 'pkg/redact on the WRITE path', color: '#059669' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(262, 20, 200, 150, 'THE REDACTOR', [
        'scrubs BEFORE the DB',
        'and before the WebSocket',
        'AWS · PEM · GitHub · Slack',
        'each rule names its leak',
        { text: 'github_pat_ / xapp- added', color: '#b45309' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(504, 20, 180, 150, 'THE PATTERN ×2', [
        'a workspace library',
        'gives the resource to NOBODY',
        'until bound to an agent',
        'used for skills',
        { text: 'and for MCP servers', color: '#059669' }
      ])}
      <path d="M 684 95 L 722 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(726, 20, 174, 150, 'THE CUTOVER', [
        'lark_* → 10 channel_*',
        'invariant (a): new tables first',
        'invariant (b): never two hubs',
        'self-host vs rolling split',
        { text: 'rollback not lossless', color: '#b45309' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THE SHARPEST RETIREMENT IN THE STUDY (migration 344)</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">the ENTIRE Plugin V1 is DELETED — verified: 14 DROP TABLE statements</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">14 tables · append-only revision logs · a snapshot compiler · a trigger</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"it never left its feature flag and holds no production data"</text>
      <text x="38" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">Replaced by three tables. Deleting complexity is a first-class act.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE PLUGIN V2 CONTRACT — THREE RELATIONS</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Action (plugin → host) · Hook (host → plugin) · Resource (no call)</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">triggers are orthogonal to capabilities</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">a capability gate FAILS INSTALLATION LOUDLY</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">No "looks installed, never fires" state.</text>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE</div>
    <h4>The synthesis: what to carry forward, and what is ours to build</h4>
    <p>75 findings ranked into mechanisms worth taking, and the two layers Multica does not have</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      ${card(20, 20, 210, 160, 'TOP 3 — THE SEAMS', [
        '1. machine / teammate split',
        '   agent_runtime + agent',
        '2. the one-statement claim',
        '   FOR UPDATE SKIP LOCKED',
        { text: '3. the row-as-lease scheduler', color: '#6d28d9' }
      ])}
      <path d="M 230 100 L 268 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(272, 20, 210, 160, 'NEXT — THE MODELS', [
        '4. deny-by-default invocation',
        '5. failure taxonomy w/ prefix',
        '6. layering w/ prohibitions',
        '7. role-named tokens',
        { text: '8. non-inheriting bindings', color: '#6d28d9' }
      ])}
      <path d="M 482 100 L 520 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(524, 20, 180, 160, 'THE PAGE', [
        '598 up-migrations',
        '144 tables / 82 fenced',
        '27 failure values',
        '225 .mdx = 45 × 5',
        { text: '75 findings', color: '#059669' }
      ])}
      <path d="M 704 100 L 742 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(746, 20, 154, 160, 'THE VERDICT', [
        'architecture reference',
        '+ mechanism source',
        'for all three poles',
        { text: 'build the other two', color: '#b45309' }
      ])}
      <rect x="20" y="206" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="234" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE FIVE LOAD-BEARING FINDINGS — if the mapping pass reads only five lines, these are the five</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">F02-01 the machine/teammate split · F04-01 the one-statement claim · F04-04 the row-as-lease scheduler</text>
      <text x="40" y="282" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">F02-09 deny-by-default invocation · F05-06 no widget model</text>
      <text x="40" y="312" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">No comparison to our own platform was made here (rule 5); the cross-platform mapping is a later pass.</text>
    </svg>
  </div>
</div>`;

    default:
      return '<div class="diagram-wrapper"><p>No diagram for batch ' + batchNum + '.</p></div>';
  }
}

// The catalog drives the dropdown (<optgroup> label = category) and the gallery.
const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'master', title: 'Executive Topology: the three poles and the two absent layers', category: 'Strategic Architecture',
    description: 'The three poles, what Multica gives each, and the two layers it does not have (composition + an own engine).' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the shape, and the method', category: 'Foundations',
    description: 'How the extract was pinned, the code-dominant shape, the similarity hazard, and the 10-rule method.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The control plane — server, daemon, queue, cron, fence', category: 'Foundations',
    description: 'What Multica is made of, and the machine/teammate split that makes the poles possible.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — machine, teammate, one seam', category: 'Pole 1 — The Aissistant',
    description: 'The agent record, the Backend interface, runtime-native config, and the deny-by-default invocation gate.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — a fenced tenant', category: 'Pole 2 — The Workspace',
    description: '82 of 144 tables carry workspace_id; members, issues, projects, the code link, and two custom-field layers.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — the delivery layer', category: 'Pole 3 — Automations',
    description: 'The one-statement claim, leases, named sweepers, the row-as-lease scheduler, and the failure taxonomy.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — and the absent widget model', category: 'Cross-Cutting',
    description: 'A shared-first layering whose rules are prohibitions, named adapters, tokens, and no composer.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole — perimeter, plugin reset, cutover', category: 'Escape Hatch',
    description: 'Write-path redaction, the deleted 14-table Plugin V1, MCP in both directions, and the channel cutover.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — ranked mechanisms and the verdict', category: 'Strategic Decision',
    description: '75 findings ranked, the absences named, and the verdict: reference + mechanism source, and build the rest.' }
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
