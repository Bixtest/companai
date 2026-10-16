// High-precision SVG diagrams for each batch of the buzz Platform Study.
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
// MASTER — Executive topology: the three poles, the proof surface, and the
// negative that defines where buzz stops.
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>buzz Platform Study Topology: the workspace is the event log, and the isolation is proven</h4>
    <p>Where each studied mechanism lands, and the one absence that defines the platform</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('m')}

      <!-- Outer boundary -->
      <rect x="20" y="20" width="920" height="480" rx="16" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #7c3aed)">buzz 0.5.28 — A SELF-HOSTED TEAM WORKSPACE ON NOSTR (NIP-01)</text>
      <text x="45" y="72" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">34 Rust crates · 62 migrations · 136 registered event kinds · every action is a signed event in one log</text>

      <!-- POLE 1 -->
      <g transform="translate(45, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#7c3aed" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">POLE 1 — AISASSISTANT</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">An agent is a keypair</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A colleague, not a bot account</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• agent = key + membership (b02)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• memory = NIP-AE engrams (b02)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• six tools, descriptions coach (b02)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• NIP-OA: owner attests, not acts (b02)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">Default mode: bypass-permissions</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">The safety posture starts here —</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">the opposite of our default-deny</text>
      </g>

      <!-- POLE 2 -->
      <g transform="translate(345, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.8"/>
        <rect x="14" y="14" width="108" height="22" rx="4" fill="#2563eb" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#1d4ed8">POLE 2 — WORKSPACE</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">Strong — the event log IS it</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">One table, three lenses</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 57 tables, 41 fenced by community (b03)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Stream/Forum/Workflow = kind (b03)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• membership is the access gate (b03)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• the fence is LINTABLE (b03)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#10b981" fill-opacity="0.14"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">Isolation = non-interference</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Proven in TLA+, then checked</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">against the running code (b03/b06)</text>
      </g>

      <!-- POLE 3 -->
      <g transform="translate(645, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#059669" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">POLE 3 — AUTOMATIONS</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">Event-native, security first</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Ahead of its feature completeness</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• YAML in, canonical JSON stored (b04)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 5 triggers, 7 actions (2 stubs) (b04)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• cron = deterministic, not locked (b04)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• authority gate at all 4 doors (b04)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">The approval gate is dead code</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">~330 lines unreachable; the</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">mint is missing (b04, F4-5)</text>
      </g>

      <!-- Bottom band: the verdict -->
      <g transform="translate(45, 370)">
        <rect width="880" height="52" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="18" y="24" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">buzz — A COMMUNICATION SUBSTRATE WITH A PROOF SURFACE</text>
        <text x="18" y="43" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Take the guard-as-document pattern, LIMITS.md, the mutation test, the projection rules, and the prose contract beside the formalism.</text>
      </g>

      <g transform="translate(45, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">THE PROVEN NEGATIVE — NO WIDGET MODEL</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The FIFTH platform with no composer. An event log extends data and behaviour — never layout (b05).</text>
      </g>

      <g transform="translate(495, 432)">
        <rect width="430" height="52" rx="10" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">THE PROOF SURFACE — FIVE ARTEFACTS</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">A prose contract + TLA+ + Tamarin + a runtime conformance harness whose LIMITS.md names its own blind spots (b06).</text>
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
    <h4>The pin, the extraction, and the name that confuses every reader</h4>
    <p>How the extract was pinned, where it lived, and the three names for one product</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '6,492 entries / 5,807 files',
        { text: 'md5 1219b15b… pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: EXTRACTION', [
        'MAX_PATH: max 118 chars',
        'no limit hit',
        '5,807 of 5,807 files',
        { text: '0 missing, 0 extra', color: '#059669' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 200, 120, 'STEP 3: THE SHAPE', [
        '34 Rust crates',
        'Tauri desktop + Flutter mobile',
        'the CLIENT > the server',
        { text: 'polyglot monorepo', color: '#059669' }
      ])}
      <path d="M 704 80 L 742 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(746, 20, 154, 120, 'STEP 4: THE FRAME', [
        'P1 aissistant',
        'P2 workspace',
        'P3 automations',
        { text: '+ PX / PZ', color: '#059669' }
      ])}
      <rect x="20" y="170" width="880" height="130" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="198" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b91c1c">THE RENAME HAZARD — THREE NAMES, ONE PRODUCT</text>
      <text x="40" y="224" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">The product is buzz, and its own tree still says sprout and sprig. Cargo.toml's repository points at</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">github.com/block/sprout; AGENTS.md still names squareup/sprout-oss; and a whole crate is named sprig.</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">The rename was executed as scoped PRs (#958, #1012, #1043, #1333) — complete in code, incomplete in metadata.</text>
      <text x="40" y="288" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#b91c1c">A rename is not finished until the METADATA has been grepped too.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The platform overview: the event is the whole API</h4>
    <p>One log, one kind integer, three lenses over the same storage</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      ${card(20, 20, 210, 140, 'THE UNIT', [
        'a signed Nostr event',
        'six fields, one integer',
        'kind: u32 decides everything',
        '136 registered kinds',
        { text: 'add a kind, not an endpoint', color: '#059669' }
      ])}
      <path d="M 230 90 L 268 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(272, 20, 210, 140, 'THE STORE', [
        'one append-only log',
        'idempotent append',
        'channel_id is a LOCALITY',
        'one search_tsv, no per-surface table',
        { text: 'the relay = the truth', color: '#059669' }
      ])}
      <path d="M 482 90 L 520 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(524, 20, 210, 140, 'THE SURFACES', [
        'Stream / Forum / Workflow',
        'differ by KIND, not storage',
        '7 surfaces; 3 clients',
        'the client tree > the server',
        { text: 'one log, three lenses', color: '#059669' }
      ])}
      ${card(20, 180, 460, 140, 'WHAT THE REGISTRY PROVES ABOUT THE PRODUCT', [
        'The kind registry is the real feature list — read it, not the docs.',
        'A doc claimed 127 kinds; another claimed 80. The code holds 136.',
        'Moderation commands (9040-9044) are EXECUTED, never stored —',
        'so "everything is just an event" has a measured boundary, enforced',
        'by a compile-time assertion.'
      ])}
      ${card(500, 180, 400, 140, 'THE ONE-SENTENCE GLOSS', [
        '"A workspace where humans and agents build',
        'together, on a relay you own."',
        '',
        'Premise: the workspace IS the event log.',
        'Everything below follows from that choice.'
      ])}
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE</div>
    <h4>The aissistant: an agent is a colleague</h4>
    <p>Identity like a person's, memory as a custom NIP, and a six-tool surface</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      ${card(20, 20, 210, 150, 'IDENTITY & OWNERSHIP', [
        'agent = a keypair',
        '+ channel memberships',
        'a member like any person',
        'NIP-OA owner attestation',
        { text: 'attests — never impersonates', color: '#059669' },
        { text: 'authorship is never rewritten', color: '#059669' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(272, 20, 210, 150, 'MEMORY', [
        'NIP-AE "Agent Engrams"',
        'kind:30174',
        'NIP-44 encrypted',
        'to the (agent, owner) pair',
        { text: 'the owner can always read it', color: '#059669' },
        'community-scoped too'
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(524, 20, 210, 150, 'THE TOOL SURFACE', [
        'six tools, not sixty',
        'descriptions coach the model',
        'shell: 8 KB to model, 10 MB to disk',
        'ACP / MCP both swappable',
        { text: 'a surface small enough to reason about', color: '#059669' },
        'two binaries: buzz-agent + buzz-dev-mcp'
      ])}
      <rect x="20" y="190" width="880" height="110" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="216" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b91c1c">THE SAFETY POSTURE STARTS HERE</text>
      <text x="40" y="242" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">The default permission mode is bypass-permissions. There is a six-rung ladder (default → auto → acceptEdits →</text>
      <text x="40" y="262" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">bypass → dontAsk → plan) and a plan rung that executes nothing — but the default sits at the permissive end.</text>
      <text x="40" y="286" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#b91c1c">Any statement about buzz's agent safety must begin at this line, not at the ladder.</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE</div>
    <h4>The workspace: a tenant fence that is proven, then lintable</h4>
    <p>Three fences — a type, a schema, and a proof — over one shared store</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      ${card(20, 20, 210, 150, 'FENCE 1 — THE TYPE', [
        'CommunityId(Uuid)',
        'an opaque newtype',
        'no Default / no Deserialize',
        'no From<Uuid>',
        { text: 'removes the accidental path', color: '#059669' },
        { text: '"a LINT fence, not a compiler fence"', color: '#b45309' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-03)"/>
      ${card(272, 20, 210, 150, 'FENCE 2 — THE SCHEMA', [
        '57 tables',
        '41 carry community_id',
        'the exceptions = a reviewable table',
        'a migration lint over ALL 62',
        { text: 'community-LEADING keys', color: '#059669' },
        'exemptions carry a reason column'
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-03)"/>
      ${card(524, 20, 210, 150, 'FENCE 3 — THE PROOF', [
        'TLA+ isolation model',
        'Tamarin authorization model',
        'stated as NON-INTERFERENCE',
        'A\'s actions never change B\'s',
        { text: 'observations (b03/b06)', color: '#059669' },
        'the runtime half checks executions'
      ])}
      ${card(20, 190, 460, 150, 'WHAT THE PROOF COVERS — AND WHAT IT NAMES AS EXCLUDED', [
        'In scope: C2.1 query results · C2.2 authorization decisions',
        'C2.3 emitted errors · C2.4 audit-chain contents.',
        '',
        'Two channels are closed by CODE-FENCES, and the doc says so:',
        '"clean — but by current code, not by the proof."',
        '',
        'The platform names its own carve-outs rather than hiding them.'
      ])}
      ${card(500, 190, 400, 150, 'THE SHIPPED HA EXAMPLE IS SELF-DECLARED', [
        'NON-CONFORMING on NIP-98 replay —',
        '',
        'with the files and lines named and a',
        'recommended fix given.',
        '',
        'And by batch 06 the CODE had closed it'
      ])}
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE</div>
    <h4>Automations: deterministic at-most-once, and a gate at every door</h4>
    <p>One authority function, four call sites, and a cron whose dedupe is determinism</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      ${card(20, 20, 200, 140, 'DEFINITION', [
        'YAML authored',
        'canonical JSON stored',
        'stored as kind 30620',
        '5 triggers (doc said 4)',
        '7 actions (2 are stubs)',
        { text: 'validation is a real gate', color: '#059669' }
      ])}
      <path d="M 220 90 L 258 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(262, 20, 200, 140, 'EXECUTION', [
        'sequential, single-pass',
        'templates: single-pass, non-recursive',
        'conditions: evalexpr + 3 defences',
        'author comes from the SIGNATURE',
        { text: 'PartialProgress keeps the trace', color: '#059669' }
      ])}
      <path d="M 462 90 L 500 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(504, 20, 200, 140, 'THE 4 DOORS', [
        'event door (fire-and-forget)',
        'cron door (60 s loop)',
        'webhook door',
        'manual trigger',
        { text: 'one gate, called at all four', color: '#059669' },
        'fail-closed, before the claim'
      ])}
      ${card(20, 180, 880, 160, 'THE CRON TRICK — AND THE HONEST HOLE', [
        'The at-most-once claim is DETERMINISTIC, not locked: the instant is in the key, so a PK conflict is the dedupe.',
        'No lock, no coordinator, restart-safe — and the interval anchor is read back from the claim table.',
        '',
        'But: the approval gate is DEAD CODE by measurement. WaitingApproval is never written and',
        'create_approval has ZERO production callers, so ~330 lines of grant / deny / resume are unreachable.',
        'The token, the hash, the scoping and the fail-closed approver check are all done — the MINT is missing.',
        '',
        'And the conformance suite REFUSES to fake a green run, naming pending_lane WF-08 as its blocker.'
      ])}
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE</div>
    <h4>Widgets &amp; frontend: a proven negative, and a guard-as-document</h4>
    <p>No composer anywhere — and the pattern buzz uses instead of one</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      ${card(20, 20, 200, 150, 'THE NEGATIVE (MEASURED)', [
        'no widget model',
        'no composer',
        '27 "widget" hits tree-wide,',
        'all accounted for',
        { text: 'the only CREATE TABLE widgets', color: '#b91c1c' },
        { text: 'is a negative fixture in a #[test]', color: '#b91c1c' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(262, 20, 200, 150, 'WHAT COMPOSES INSTEAD', [
        'the EVENT KIND',
        '136 registered kinds',
        'add a kind, not a component',
        'Channel Canvas (40100) is a',
        'document, not a widget tree',
        { text: 'an event log is NOT a widget model', color: '#b45309' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(504, 20, 200, 150, 'THE GUARD-AS-DOCUMENT', [
        'a shared -core script',
        '+ a thin per-app wrapper',
        '+ a reason-annotated allowlist',
        '+ a place in the default gate',
        { text: 'check-px-text (design)', color: '#059669' },
        { text: 'check-pubkey-truncation (security)', color: '#059669' }
      ])}
      ${card(20, 190, 430, 150, 'THE SECURITY RULE THAT TRANSFERS', [
        'check-pubkey-truncation is an executable',
        'SECURITY invariant, not a style rule:',
        '',
        'a truncated identifier a human TRUSTS is',
        'FORGEABLE by vanity-grinding. Ad-hoc',
        'truncation had fragmented into 5 formats.'
      ])}
      ${card(470, 190, 430, 150, 'THREE ALLOWLIST MECHANISMS, KEYED PER RULE', [
        'allowedFiles — for the canonical module.',
        'overrides — keyed by whichever of literal /',
        'line number is STABLE for that rule.',
        'a wholesale .test. exclusion.',
        '',
        'The choice of key shape is per-rule — that is',
        'the part a naive port gets wrong.'
      ])}
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE</div>
    <h4>Out-of-pole: five safety artefacts across three languages</h4>
    <p>The study's strongest PZ surface, and the gate that documents its own blind spots</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      ${card(20, 20, 200, 150, 'THE PROSE CONTRACT', [
        'docs/multi-tenant-relay.md',
        '1,110 lines, status: draft',
        '5 named NON-GOALS',
        '10 axioms, each admitted',
        'per deployment',
        { text: 'a §Conformance gate per axiom', color: '#059669' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(262, 20, 200, 150, 'THE MECHANIZED MODELS', [
        'MultiTenantRelay.tla',
        '1,142 lines · 12 invariants',
        '13 mutations, 6 confirmed red',
        { text: '4 DELIBERATELY-FALSE probes', color: '#b45309' },
        'MultiTenantAuth.spthy',
        '21 lemmas — proven UNDER key compromise'
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(504, 20, 200, 150, 'THE RUNTIME HALF', [
        'buzz-conformance crate',
        'checks EXECUTIONS, not code',
        'the checker re-implements the spec',
        'EmitGuard = a Drop guard',
        { text: 'a silent omission becomes a failure', color: '#059669' }
      ])}
      <rect x="20" y="190" width="880" height="170" rx="10" fill="#10b981" fill-opacity="0.08" stroke="#10b981" stroke-width="1.8"/>
      <text x="40" y="218" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#047857">★ LIMITS.md — THE BATCH'S #1 RECOMMENDATION</text>
      <text x="40" y="246" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">"The runtime conformance harness is NOT a proof." The file that says so names SEVEN things the gate does</text>
      <text x="40" y="266" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">not catch, names the owner of each gap, names the WRONG answer to the open design question, and states</text>
      <text x="40" y="286" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">plainly which half of itself is NOT ARMED (the read seam). A gate that publishes its own blind spots is</text>
      <text x="40" y="306" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">worth more than a gate that reports green — because a reader can CALIBRATE what a pass means.</text>
      <text x="40" y="336" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#047857">Pair it with the mutation test — "prove the tripwire fires" — and every other guard becomes trustworthy.</text>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE</div>
    <h4>The synthesis: where buzz sits, and what we take</h4>
    <p>Seven platforms ranked, three tiers of mechanism, and one recommendation</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      ${card(20, 20, 280, 170, 'TIER 1 — ADOPT NOW (8)', [
        '1 · LIMITS.md for every gate',
        '2 · "prove the tripwire fires"',
        '3 · the guard-as-document',
        '4 · the three projection rules',
        '5 · normalize at the enforcement point',
        '6 · the generation fence',
        '7 · the prose contract',
        '8 · _Avoid_: anti-vocabulary lists'
      ])}
      <path d="M 300 105 L 330 105" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(334, 20, 280, 170, 'TIER 2 — TENANCY TIER (7)', [
        '9 · the schema lint',
        '10 · the type fence + its limit',
        '11 · isolation as non-interference',
        '12 · schema as desired-state',
        '13 · the runtime conformance gate',
        '14 · hash-versioning discipline',
        '15 · deletion as a lifecycle',
        '→ for when WE build the tenancy layer'
      ])}
      <path d="M 614 105 L 644 105" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(648, 20, 252, 170, 'TIER 3 — OBSERVE LATER (7)', [
        '16 · the authority gate at every door',
        '17 · deterministic at-most-once cron',
        '18 · the build-split verification',
        '19 · fail-open / fail-closed flags',
        '20 · the egress guard inventory',
        '21 · two dials, one virtual rem',
        '22 · the rename hazard on the checklist'
      ])}
      <rect x="20" y="210" width="880" height="150" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.8"/>
      <text x="40" y="238" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE VERDICT, AND THE RANKED ORDER ACROSS ALL SEVEN STUDIED PLATFORMS</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">1 · buzz (the proof surface) · 2 · Multica (the closest architectural neighbour) · 3 · n8n (the composition surface)</text>
      <text x="40" y="284" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">4 · Gas Town · 5 · Hermes · 6 · Paperclip · 7 · CrewAI.</text>
      <text x="40" y="310" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">RECOMMENDATION: take ALL FIVE in §9 — LIMITS.md · the mutation test · the guard-as-document · the prose</text>
      <text x="40" y="330" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">contract · the rename-hazard checklist line. Four of the five are documents or tests, not systems.</text>
      <text x="40" y="352" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">Each has a STATED WRONG ANSWER in the buzz source — so we know what we would get wrong improvising it.</text>
    </svg>
  </div>
</div>`;
  }
  // Fallback for any future batch without an authored diagram
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH ${batchNum} VISUAL GUIDE</div>
    <h4>buzz — batch ${batchNum}</h4>
    <p>No authored diagram for this batch.</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 120" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs(batchNum)}
      ${card(20, 20, 880, 80, 'PLACEHOLDER', ['Add a case for this batch in diagrams.js.'])}
    </svg>
  </div>
</div>`;
}

const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'master', title: 'Executive Topology: the workspace is the event log, and the isolation is proven', category: 'Strategic Architecture',
    description: 'The three poles, what buzz gives each, the proof surface, and the proven negative.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the extraction, and the rename hazard', category: 'Foundations',
    description: 'How the extract was pinned, where it lived, and the three names for one product.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The overview — the event is the whole API', category: 'Foundations',
    description: 'One log, one kind integer, three lenses; 136 registered kinds; the client > the server.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — an agent is a colleague', category: 'Pole 1 — The Aissistant',
    description: 'A keypair + membership, NIP-AE memory, six tools, and a bypass-permissions default.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — three fences over one store', category: 'Pole 2 — The Workspace',
    description: 'Type fence, schema fence, proof fence. 57 tables, 41 fenced, over 62 migrations.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — deterministic at-most-once', category: 'Pole 3 — Automations',
    description: 'One authority gate at four doors; a cron that dedupes by determinism; a dead approval gate.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — a proven negative', category: 'Cross-Cutting',
    description: 'No widget model in 27 accounted-for hits; the guard-as-document pattern instead.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole — five artefacts, three languages', category: 'Escape Hatch',
    description: 'The prose contract, TLA+ 13 mutations, Tamarin under compromise, LIMITS.md.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — where buzz sits, what we take', category: 'Strategic Decision',
    description: 'Three tiers of mechanism, the seven-platform ranking, and the five-part recommendation.' }
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
