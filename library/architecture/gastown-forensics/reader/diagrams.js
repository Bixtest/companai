// High-precision SVG diagrams for each batch of the Gas Town Platform Study.
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
// MASTER — Executive topology: the three poles, and the decided limits that
// define where Gas Town stops.
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>Gas Town Platform Study Topology: three poles, and four decided limits</h4>
    <p>Where each studied mechanism lands, and the boundaries the platform states about itself</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('m')}

      <!-- Outer boundary -->
      <rect x="20" y="20" width="920" height="480" rx="16" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #7c3aed)">GAS TOWN 1.2.1 — A SINGLE-MACHINE GO HARNESS FOR DRIVING AI CODING AGENTS</text>
      <text x="45" y="72" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">1,231 Go files / 474,724 lines · 77 packages · 292 CLI commands · 46 % of Go files are tests</text>

      <!-- POLE 1 -->
      <g transform="translate(45, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#7c3aed" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">POLE 1 — AISASSISTANT</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">An agent is a bead</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Everything about it is data</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• fields in the description (b02)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• identity = a mail address (b02)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 13-preset registry (b02)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• gt prime reads the dir (b02)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">No engine of its own — CLIs only</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">The provider is always an</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">external process the host runs</text>
      </g>

      <!-- POLE 2 -->
      <g transform="translate(345, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.8"/>
        <rect x="14" y="14" width="108" height="22" rx="4" fill="#2563eb" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#1d4ed8">POLE 2 — WORKSPACE</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A filesystem workspace</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Discovered by walking up the path</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 4-layer config + a veto (b03)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• THE HOOK = durability (b03)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• durable + ephemeral wisps (b03)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• identity ≠ behaviour (b03)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">One mayor per machine</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Multi-town needs containers/VMs —</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">stated outright in the code</text>
      </g>

      <!-- POLE 3 -->
      <g transform="translate(645, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#059669" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">POLE 3 — AUTOMATIONS</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A real delivery layer</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">And the supervision is a document</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 47 TOML formulas, tested (b04)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• mail: queue OR interrupt (b04)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• batch-then-bisect merge (b04)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• capped re-dispatch → Mayor (b04)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#10b981" fill-opacity="0.14"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">The watchdog chain has a base case</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">daemon → Boot → Deacon →</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Witness → Polecat</text>
      </g>

      <!-- Bottom band: the decided limits -->
      <g transform="translate(45, 370)">
        <rect width="880" height="52" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="18" y="24" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">GAS TOWN — A MECHANISM SOURCE AND A BOUNDARY-SETTING REFERENCE</text>
        <text x="18" y="43" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Take the Hook, ZFC, the three-layer sandbox, the registry, the tested formulas. Treat its refusals as signposts.</text>
      </g>

      <g transform="translate(45, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">ABSENT — TENANCY & ENGINE</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">One town per machine; the ledger is Beads (external); the engine is the user's CLI.</text>
      </g>

      <g transform="translate(495, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">ABSENT — COMPOSITION & A SCHEDULER</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">No widget model (0 composers); patrols are prompts + ticks, not a job graph.</text>
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
    <h4>The pin, the identity hazard, and the test-ratio hazard</h4>
    <p>How the extract was pinned, why two identities disagree, and why every line count must state its basis</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '1,737 entries / 1,563 files',
        { text: 'md5 f2485c1b… pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: IDENTITY', [
        'REPO: gastownhall/gastown',
        'MODULE: steveyegge/gastown',
        'npm @gastown/gt 1.2.1',
        { text: 'Re-homed, path not rewritten', color: '#b45309' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 200, 120, 'STEP 3: THE SHAPE', [
        '1,231 .go / 474,724 lines',
        '77 package directories',
        'cmd/ = 697 lines, 3 binaries',
        { text: 'CLI-dominant, not docs', color: '#059669' }
      ])}
      <path d="M 704 80 L 742 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(746, 20, 154, 120, 'STEP 4: THE FRAME', [
        'P1 aissistant',
        'P2 workspace',
        'P3 automations',
        { text: '+ PX widgets/front', color: '#059669' }
      ])}
      <rect x="20" y="170" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="198" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE HAZARD THAT CHANGES EVERY COUNT — 46 % OF GO FILES ARE TESTS</text>
      <text x="40" y="224" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">568 of 1,231 Go files are _test.go. In internal/ the split is 247,851 production vs 225,046 test lines.</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">A "lines of Go" reading is HALF TEST CODE unless it says otherwise — every count in this study states its basis.</text>
      <text x="40" y="268" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rule 1 applies as a habit, not a suspicion: the docs here are excellent and almost true.</text>
      <text x="40" y="288" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">The highest test ratio of any platform studied.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The control plane: one CLI, one daemon, one dashboard</h4>
    <p>What Gas Town is made of, and the Town/Rig model the whole thing rests on</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      ${card(20, 20, 210, 140, 'THE CLI', [
        'internal/cmd/ — 103,691 lines',
        '292 cobra commands',
        'cmd/gt is TEN lines',
        { text: 'the largest package', color: '#6d28d9' }
      ])}
      <path d="M 230 90 L 268 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(272, 20, 210, 140, 'THE DAEMON', [
        'named, testable jobs',
        'checkpoint_dog · doctor_dog',
        'quota_dog · compactor_dog',
        'convoy_manager · reaper',
        { text: 'a supervisor of small routines', color: '#059669' }
      ])}
      <path d="M 482 90 L 520 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(524, 20, 180, 140, 'THE DASHBOARD', [
        'POST /api/run',
        'runs a gt command string',
        'one surface, two doors',
        { text: 'no second implementation', color: '#059669' }
      ])}
      <path d="M 704 90 L 742 90" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-01)"/>
      ${card(746, 20, 154, 140, 'THE BINARIES', [
        'gt',
        'gt-proxy-client',
        'gt-proxy-server',
        { text: 'cmd/ = 697 lines', color: '#059669' }
      ])}
      <rect x="20" y="186" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="214" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">TOWN / RIG — THE CONTAINER IS A FILESYSTEM</text>
      <text x="40" y="240" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Town (~/gt/) contains Rigs; a Rig contains its agent directories: polecats/ · crew/ · refinery/rig/ · witness/ · mayor/rig/.</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">The role taxonomy is DATA — 7 TOML files embedded in the binary, each carrying scope, session, env, health and nudge.</text>
      <text x="40" y="286" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">THE WATCHDOG CHAIN: daemon → Boot → Deacon → Witness → Polecat — each deciding whether the level below is alive.</text>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE</div>
    <h4>The aissistant: an agent is a bead, and the role comes from the directory</h4>
    <p>The agent record, the provider registry, and how the agent learns what it is</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      ${card(20, 20, 210, 150, 'THE BEAD', [
        'AgentFields in the description',
        '"key: value" lines, file-locked',
        'hook_bead · agent_state',
        'cleanup_status (self-reported)',
        { text: 'state ALSO as bead labels', color: '#6d28d9' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(272, 20, 210, 150, 'THE IDENTITY', [
        '{Role, Rig, Name, Prefix}',
        'parsed from a MAIL ADDRESS',
        '8 roles incl. overseer',
        { text: '7 TOML files — a divergence', color: '#b45309' }
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(524, 20, 180, 150, 'THE REGISTRY', [
        '13 presets, one struct each',
        'claude · gemini · codex · …',
        'ProcessNames · ResumeFlag',
        { text: '"no provider switches"', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-02)"/>
      ${card(746, 20, 154, 150, 'THE INJECTOR', [
        'gt prime',
        'infers role from the DIR',
        'runs as SessionStart hook',
        { text: '5-step session-ID fallback', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">THE NUDGE HAS TWO PATHS</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Claude Code drains its queue via the UserPromptSubmit hook</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Gemini/Codex have no equivalent → a background poller</text>
      <text x="38" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">waits for idle, then injects via tmux</text>
      <text x="38" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">A depended-on capability with no uniform primitive.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">BEHAVIOUR IS A PROMPT TEMPLATE</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">templates/polecat-CLAUDE.md — 296 lines</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"THE IDLE POLECAT HERESY" — you MUST run gt done</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"SINGLE-TASK FOCUS" — one job, one bead</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">Where code cannot enforce it, the prompt says so bluntly.</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE</div>
    <h4>The workspace: a filesystem container and its durability primitive</h4>
    <p>The town is discovered by walking up; config is a four-layer stack; the Hook survives restarts</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      <rect x="20" y="20" width="880" height="150" rx="12" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="#2563eb" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#1d4ed8">THE TOWN IS DISCOVERED, NOT CONFIGURED — walk UP for mayor/town.json</text>
      ${card(40, 60, 200, 96, 'TOWN', [
        '~/gt/ — the management HQ',
        'TownConfig = identity only',
        { text: 'owner email · public name', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(256, 60, 200, 96, 'RIG', [
        'a managed repository',
        'Polecats · Crew · Witness',
        { text: 'the org chart is a DIR TREE', color: '#059669' }
      ], { stroke: '#2563eb' })}
      ${card(472, 60, 200, 96, 'THE CONFIG STACK', [
        'system → town → bead → wisp',
        'a returned SOURCE per value',
        { text: 'a local VETO (SourceBlocked)', color: '#b45309' }
      ], { stroke: '#2563eb' })}
      ${card(688, 60, 200, 96, 'THE LEDGER', [
        'durable issues',
        '+ ephemeral WISPS',
        { text: 'merged EXPLICITLY', color: '#b45309' }
      ], { stroke: '#2563eb' })}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE HOOK IS THE DURABILITY PRIMITIVE</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"work on your hook survives session restarts,</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)"> context compaction, and handoffs" (hook.go:33)</text>
      <text x="38" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">The SESSION is ephemeral; the POINTER is not.</text>
      <text x="38" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">gt sling (keep context) vs gt handoff (fresh context).</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">ZFC — ZERO FRAMEWORK COGNITION</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"Gas Town provides TRANSPORT (tmux, hooks, nudges)</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">but doesn't make decisions for agents."</text>
      <text x="488" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">52 in-code references · a changelog of removals</text>
      <text x="488" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">The clearest stated-and-enforced philosophy in the study.</text>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE</div>
    <h4>Automations: workflows as data, and a watchdog chain with a base case</h4>
    <p>47 tested formulas, a real mail bus, and the answer to who watches the watchers</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      ${card(20, 20, 200, 150, '1 · THE FORMULAS', [
        '47 .formula.toml embedded',
        'convoy · workflow · expansion · aspect',
        'Pour → durable sub-wisps',
        { text: 'the PROSE IS TESTED', color: '#059669' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(262, 20, 200, 150, '2 · THE MAIL BUS', [
        'beads-backed',
        'lists · queues · announce',
        'queue OR interrupt delivery',
        { text: '3s idle-or-queue fallback', color: '#059669' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(504, 20, 200, 150, '3 · THE REFINERY', [
        'batch-then-bisect',
        'batch 5 · wait 30s',
        'retry before bisecting',
        { text: 'safety stop = a bead LABEL', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-04)"/>
      ${card(746, 20, 154, 150, '4 · RECOVERY', [
        're-dispatch capped at 3',
        '5m cooldown',
        'then escalate to Mayor',
        { text: 'the reaper decides NOTHING', color: '#059669' }
      ])}
      <rect x="20" y="196" width="880" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="222" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE WATCHDOG CHAIN — AND ITS NAMED BASE CASE</text>
      <text x="40" y="248" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">daemon → Boot (a dog, fresh each tick, wakes the Deacon via gt nudge) → Deacon (heartbeat = a FILE, 5m/20m thresholds)</text>
      <text x="40" y="268" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">→ Witness → Polecat — each level decides whether the level below is alive.</text>
      <text x="40" y="294" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">THE RECURSION, ANSWERED: Witnesses read the Deacon's agent-bead last_activity TIMESTAMP and escalate only if stale —</text>
      <text x="40" y="314" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">"instead of sending heartbeat mail" (mol-deacon-patrol). The patrol formula is a design document.</text>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE</div>
    <h4>Widgets and frontend: the CLI is the UI, and there is no widget model</h4>
    <p>Three doors onto one command surface — and a measured absence</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      ${card(20, 20, 200, 150, 'THE SHAPE', [
        'CLI 103,691 lines',
        'web 15,488 · TUI ~4,319',
        '292 commands',
        { text: 'the CLI is ~5x the rest', color: '#6d28d9' }
      ])}
      <path d="M 220 95 L 258 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(262, 20, 200, 150, 'THE STYLE', [
        'Lipgloss over an AYU theme',
        'Success · Warning · Error · Info',
        'agent mode → RAW text',
        { text: 'graceful degradation', color: '#059669' }
      ])}
      <path d="M 462 95 L 500 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(504, 20, 200, 150, 'THE TUI', [
        'Bubble Tea (4 files)',
        'convoy/ · feed/',
        'model · view · keys',
        { text: 'one surface at a time', color: '#059669' }
      ])}
      <path d="M 704 95 L 742 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-05)"/>
      ${card(746, 20, 154, 150, 'THE DASHBOARD', [
        'ONE page · 13 panels',
        'HTMX 1.9.10 + SSE',
        'CSRF meta token',
        { text: 'no build step', color: '#059669' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b91c1c">THE NEGATIVE: NO WIDGET MODEL</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">0 composers found anywhere in the tree</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">"widget" in 7 files — all incidental</text>
      <text x="38" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">the dashboard is a FIXED 13-panel grid</text>
      <text x="38" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">The FOURTH platform with none (Paperclip, CrewAI, Multica).</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE COST IS MEASURED</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A response cache with a SERIALISING mutex</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">exists because two tabs refreshing at once</text>
      <text x="488" y="286" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">would cause "cascading bd process storms"</text>
      <text x="488" y="312" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">(GH#2618) — one surface, two doors, named cost.</text>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE</div>
    <h4>Out-of-pole: a three-layer sandbox, a rotator, and plugins with no AI</h4>
    <p>The machinery that makes this a product rather than a harness</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      ${card(20, 20, 210, 150, '1 · NETWORK', [
        'an mTLS CA',
        'a certificate DENYLIST',
        'checked in the TLS handshake',
        { text: 'rotated on a TTL', color: '#059669' }
      ])}
      <path d="M 230 95 L 268 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(272, 20, 210, 150, '2 · THE CLI SURFACE', [
        'AllowedSubcommands',
        'gt · bd only',
        'absent argv[1] → 403',
        { text: 'a subprocess allow-list', color: '#059669' }
      ])}
      <path d="M 482 95 L 520 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(524, 20, 200, 150, '3 · VCS', [
        'a git smart-HTTP proxy',
        'containers never contact',
        'GitHub directly',
        { text: 'all traffic flows through', color: '#059669' }
      ])}
      <path d="M 724 95 L 762 95" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-06)"/>
      ${card(766, 20, 134, 150, 'THE ROTATOR', [
        'swaps the KEYCHAIN',
        'backup → swap',
        'respawn → --resume',
        { text: 'work survives it', color: '#b45309' }
      ])}
      <rect x="20" y="196" width="430" height="136" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="38" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">DOCTOR — 75 FIXABLE CHECKS</text>
      <text x="38" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">20,485 lines across 75 non-test check files</text>
      <text x="38" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">a check is FixableCheck — it REPAIRS, not reports</text>
      <text x="38" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">each header cites the ticket that explains it</text>
      <text x="38" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">Repair is a first-class capability.</text>
      <rect x="470" y="196" width="430" height="136" rx="10" fill="#059669" fill-opacity="0.08" stroke="#059669" stroke-width="1.6"/>
      <text x="488" y="222" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">PLUGINS — 13 SHELL SCRIPTS</text>
      <text x="488" y="246" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">plugin.md (TOML) + run.sh — 2,069 lines</text>
      <text x="488" y="266" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">a GATE · bead-label TRACKING · EXECUTION metadata</text>
      <text x="488" y="290" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">scoped town-level or rig-level</text>
      <text x="488" y="314" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">"Executed via run.sh — NO AI INTERPRETATION."</text>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE</div>
    <h4>The synthesis: twelve mechanisms, four of them decided limits</h4>
    <p>What to carry forward, and what is ours to build</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      ${card(20, 20, 210, 160, 'TOP 4 — THE LIMITS', [
        '1. the Hook (durability)',
        '2. ZFC (transport, does not decide)',
        '3. the three-layer sandbox',
        { text: '4. the watchdog base case', color: '#6d28d9' }
      ])}
      <path d="M 230 100 L 268 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(272, 20, 210, 160, 'NEXT — THE MODELS', [
        '5. the 13-preset registry',
        '6. 47 tested formulas',
        '7. the 4-layer config stack',
        { text: '8. plugins = shell scripts', color: '#6d28d9' }
      ])}
      <path d="M 482 100 L 520 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(524, 20, 180, 160, 'THE PAGE', [
        '1,231 Go files',
        '474,724 lines',
        '46 % are tests',
        '292 CLI commands',
        { text: '68 findings', color: '#059669' }
      ])}
      <path d="M 704 100 L 742 100" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-07)"/>
      ${card(746, 20, 154, 160, 'THE VERDICT', [
        'mechanism source',
        '+ boundary-setting',
        'reference',
        { text: 'not a template', color: '#b45309' }
      ])}
      <rect x="20" y="206" width="880" height="130" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="234" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE FIVE LOAD-BEARING FINDINGS — if the mapping pass reads only five lines, these are the five</text>
      <text x="40" y="260" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">F03-03 the Hook is the durability primitive · F03-06 ZFC — Zero Framework Cognition</text>
      <text x="40" y="282" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">F04-07 the watchdog chain's named base case · F06-02/03/04 the three-layer sandbox</text>
      <text x="40" y="312" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">F05-06 no widget model — and four of the five are decided limits, not features.</text>
    </svg>
  </div>
</div>`;

    default:
      return '<div class="diagram-wrapper"><p>No diagram for batch ' + batchNum + '.</p></div>';
  }
}

// The catalog drives the dropdown (<optgroup> label = category) and the gallery.
const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'master', title: 'Executive Topology: the three poles and four decided limits', category: 'Strategic Architecture',
    description: 'The three poles, what Gas Town gives each, and the boundaries the platform states about itself.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the identity hazard, and the test ratio', category: 'Foundations',
    description: 'How the extract was pinned, why two identities disagree, and the 46%-test hazard.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The control plane — CLI, daemon, dashboard', category: 'Foundations',
    description: 'One CLI of 292 commands, a daemon of named dogs, and the Town/Rig filesystem model.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — an agent is a bead', category: 'Pole 1 — The Aissistant',
    description: 'Fields in the description, identity as a mail address, the 13-preset registry, and gt prime.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — a filesystem container', category: 'Pole 2 — The Workspace',
    description: 'Discovered by walking up the path, a four-layer config stack with a veto, and the Hook.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — formulas, mail, the watchdog chain', category: 'Pole 3 — Automations',
    description: '47 tested formulas, a mail bus with two delivery modes, and who watches the watchers.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — and the absent widget model', category: 'Cross-Cutting',
    description: 'The CLI is the UI; a Bubble Tea TUI; a 13-panel HTMX/SSE dashboard; no composer.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole — sandbox, rotator, plugins', category: 'Escape Hatch',
    description: 'A three-layer sandbox, an account rotator, 75 fixable checks, and 13 shell-script plugins.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — mechanisms and decided limits', category: 'Strategic Decision',
    description: '68 findings ranked; the top four are decided limits; the verdict and the five load-bearing findings.' }
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
