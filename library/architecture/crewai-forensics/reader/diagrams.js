// High-precision SVG diagrams for each batch of the CrewAI Platform Study.
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
// MASTER — Executive topology: the three poles, what CrewAI gives each, and
// the two clusters it does not have (ownership + delivery).
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>CrewAI Platform Study Topology: three poles, one executor, and two absent clusters</h4>
    <p>Where each studied mechanism lands, and the two things an AI-company OS needs that CrewAI does not have at any layer</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('m')}

      <!-- Outer boundary: our platform -->
      <rect x="20" y="20" width="920" height="480" rx="16" fill="var(--surface-card, #ffffff)" fill-opacity="0.4" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="52" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #7c3aed)">OUR PLATFORM — MERCATO (multi-tenant AI-company OS)</text>
      <text x="45" y="72" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">Tenant boundary • per-company credentials • the designed seam that encloses Hermes</text>

      <!-- Three poles as columns -->
      <!-- POLE 1 -->
      <g transform="translate(45, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#7c3aed" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#6d28d9">POLE 1 — AISASSISTANT</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A good agent, no employee</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Six methods define an agent</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 6-method agent contract (b02)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• ReAct loop, tools as extra (b02)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Typed failure precedent chain (b02)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Seed-deterministic identity (b06)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">Agent is NOT a stored record</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">No registry, no org, no lifecycle —</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">hiring and placement are ours</text>
      </g>

      <!-- POLE 2 -->
      <g transform="translate(345, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.8"/>
        <rect x="14" y="14" width="108" height="22" rx="4" fill="#2563eb" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#1d4ed8">POLE 2 — WORKSPACE</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">A folder, not a container</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Text binds to code by name</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Scaffolder + fixed layout (b03)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• String-reference resolution (b03)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• crewai-files 4-part subsystem (b03)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Knowledge, 10 source types (b03)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">Folder describes agents — holds none</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">Our workspace must be a container</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">of records — a different object</text>
      </g>

      <!-- POLE 3 -->
      <g transform="translate(645, 100)">
        <rect width="270" height="250" rx="12" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
        <rect x="14" y="14" width="118" height="22" rx="4" fill="#059669" fill-opacity="0.15"/>
        <text x="20" y="30" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">POLE 3 — AUTOMATIONS</text>
        <text x="14" y="60" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">Executor yes, delivery no</text>
        <text x="14" y="82" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Work is started, never arrives</text>
        <text x="14" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Flow graph: or_/and_ racing (b04)</text>
        <text x="14" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Progress = completed name set (b04)</text>
        <text x="14" y="142" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Checkpoint / resume / fork (b04)</text>
        <text x="14" y="160" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• pause + resume-by-hand (b04)</text>
        <rect x="14" y="176" width="242" height="20" rx="4" fill="#ef4444" fill-opacity="0.13"/>
        <text x="22" y="190" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b91c1c">No scheduler · queue · worker · clock</text>
        <text x="14" y="216" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">No retry, backoff, expiry or</text>
        <text x="14" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-muted, #64748b)">ownership of pending work</text>
      </g>

      <!-- Bottom band: the verdict -->
      <g transform="translate(45, 370)">
        <rect width="880" height="52" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="18" y="24" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">CREWAI 1.15.28 — A MECHANISM DONOR, NOT AN ARCHITECTURE TEMPLATE</text>
        <text x="18" y="43" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Take the bounded catalogue-with-enforcement, completed-name progress, racing semantics, seed identity, and the typed failure chain. Build the rest.</text>
      </g>

      <g transform="translate(45, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">ABSENT CLUSTER 1 — OWNERSHIP</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">No tenants, roles, agent records, or orgs. SecurityConfig marks 3 of 4 purposes TODO.</text>
      </g>

      <g transform="translate(495, 432)">
        <rect width="430" height="52" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b91c1c">ABSENT CLUSTER 2 — DELIVERY</text>
        <text x="16" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">No queue, scheduler, handoff, or responsibility. Both clusters are BUILD, not adapt.</text>
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
    <h4>The pin, the 93% documentation hazard, and the study method</h4>
    <p>How the extract was pinned, why the docs are the defining trap, and the 10-rule method that verifies every claim in code</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('00')}
      ${card(20, 20, 200, 120, 'STEP 1: THE EXTRACT', [
        'An extract, not a clone',
        'No .git — identity is the ZIP',
        '41,081 entries / 35,755 files',
        { text: 'md5 cd93b156… pinned', color: '#059669' }
      ])}
      <path d="M 220 80 L 258 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(262, 20, 200, 120, 'STEP 2: THE HAZARD', [
        'docs/ = 33,251 .mdx / 292 MB',
        '= 93% of EVERY file in the tree',
        '45 version-trees × 4 languages',
        { text: 'The docs are near-copies', color: '#b45309' }
      ])}
      <path d="M 462 80 L 500 80" stroke="var(--diagram-accent, #7c3aed)" stroke-width="2" marker-end="url(#arr-00)"/>
      ${card(504, 20, 200, 120, 'STEP 3: CODE SCALE', [
        '1,411 .py / 492,582 lines',
        '6 workspace members',
        'crewai-core 97% generated',
        { text: 'Hand-written core = 4,424', color: '#b45309' }
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
      <text x="40" y="224" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 1–4: pin first · measure before claiming · quote file+line · separate the docs' word from the code's word.</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 5–7: name the pole · mark what fits · mark what does NOT fit and why.</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Rules 8–10: record divergences · keep it additive across studies · end on a ranked recommendation.</text>
      <text x="40" y="288" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">Rule 1 is load-bearing here, not stylistic: the same claim exists 180 times in this tree.</text>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The one door in, the observability spine, and the second paradigm</h4>
    <p>Four nouns, one kickoff, a 163-event bus, and a Flow that runs as a graph beside the Crew that runs as a list</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 330" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('01')}
      <rect x="20" y="20" width="880" height="70" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
      <text x="40" y="48" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="var(--text-primary, #0f172a)">FOUR NOUNS: Agent · Task · Crew · Flow — the surface is deliberately tiny</text>
      <text x="40" y="72" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">An agent has a role, a goal, a backstory and a model. A task has a description and an expected output. A crew is agents + tasks + a process.</text>

      <g transform="translate(20, 110)">
        <rect width="270" height="200" rx="10" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#1d4ed8">kickoff() — THE ONE DOOR</text>
        <text x="16" y="54" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">crew.py:995. Everything else is config.</text>
        <text x="16" y="76" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Process = ten lines total</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• "Hierarchical" = one manager agent</text>
        <text x="16" y="116" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Per-run id minted on kickoff</text>
        <rect x="16" y="134" width="238" height="50" rx="6" fill="#f59e0b" fill-opacity="0.14"/>
        <text x="24" y="153" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#b45309">NOT A REAL HIERARCHY</text>
        <text x="24" y="170" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Two tools, no depth — an org chart</text>
        <text x="24" y="184" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">is NOT the thing to copy from here.</text>
      </g>

      <g transform="translate(310, 110)">
        <rect width="290" height="200" rx="10" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">TWO CONTROL LAYERS</text>
        <text x="16" y="54" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">An observability spine + an interceptor:</text>
        <text x="16" y="78" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 163 typed events (event_bus.py:95)</text>
        <text x="16" y="98" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Ordered sync + async handlers</text>
        <text x="16" y="118" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Replay of the recorded stream</text>
        <text x="16" y="138" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• 10 hook points (dispatch.py:40)</text>
        <rect x="16" y="152" width="258" height="32" rx="6" fill="#7c3aed" fill-opacity="0.10"/>
        <text x="24" y="172" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#6d28d9">A hook may ABORT the operation (HookAborted).</text>
      </g>

      <g transform="translate(620, 110)">
        <rect width="280" height="200" rx="10" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#047857">THE SECOND PARADIGM: FLOW</text>
        <text x="16" y="54" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A Crew is a list. A Flow is a graph.</text>
        <text x="16" y="78" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Steps joined by events (flow.py:33)</text>
        <text x="16" y="98" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Suspend / resume mid-graph</text>
        <text x="16" y="118" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• State persisted between steps</text>
        <rect x="16" y="134" width="248" height="50" rx="6" fill="#10b981" fill-opacity="0.12"/>
        <text x="24" y="153" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#059669">ALSO: SKILLS</text>
        <text x="24" y="170" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">SKILL.md, loaded in three levels</text>
        <text x="24" y="184" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">(metadata → instructions → files).</text>
      </g>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE — POLE 1</div>
    <h4>The aissistant: a small honest agent, and the seam waiting to be filled</h4>
    <p>Persona is three strings; capability is six methods; failure is typed; and the tenant-scoped toolset is a wiring task, not a redesign</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('02')}
      ${card(20, 20, 210, 150, 'PERSONA = 3 STRINGS', [
        'role · goal · backstory',
        'base_agent.py:256-258',
        'Identity is a frozen uuid',
        { text: 'No name/tenant/lifecycle', color: '#b45309' }
      ])}
      ${card(245, 20, 210, 150, 'CAPABILITY = 6 METHODS', [
        'base_agent.py:668-701',
        'executeTask · aexecuteTask',
        'createExecutor · 3 tool getters',
        { text: 'A complete agent contract', color: '#6d28d9' }
      ])}
      ${card(470, 20, 210, 150, 'THE LOOP IS ReAct', [
        'Text reasoning by default',
        'Native tool-calling is an OPTIMISATION',
        'crew_agent_executor.py:352/:505',
        { text: 'Model-agnostic by design', color: '#059669' }
      ])}
      ${card(695, 20, 205, 150, 'FAILURE IS TYPED', [
        'Structured data + retryable flag',
        'tool_failure.py:35-71',
        'Escalates tool→task→agent→crew',
        { text: 'Answers "tool broke, now what"', color: '#1d4ed8' }
      ])}

      <rect x="20" y="190" width="880" height="140" rx="10" fill="#2563eb" fill-opacity="0.08" stroke="#2563eb" stroke-width="1.6"/>
      <text x="40" y="218" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#1d4ed8">THE MOST ACTIONABLE FINDING: the tool filter already takes a run context — and nothing fills it</text>
      <text x="40" y="244" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">ToolFilterContext(agent, server_name, run_context) — mcp/filters.py:17-35 — receives everything a tenant-scoped toolset would need.</text>
      <text x="40" y="264" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">The seam exists, is well-shaped, and is unpopulated. A tenant-scoped toolset is therefore a WIRING task for us — not a redesign of the agent.</text>
      <rect x="40" y="282" width="840" height="32" rx="6" fill="#10b981" fill-opacity="0.12"/>
      <text x="52" y="303" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#059669">But: an agent is a VALUE OBJECT, not a record — no persistence, no tenancy, no org, no lifecycle. That half is ours.</text>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE — POLE 2</div>
    <h4>The workspace: a folder that binds text to code by name</h4>
    <p>How a directory of YAML describes a team, how strings become live objects, and where the folder model stops short of a container of records</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 340" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('03')}
      <g transform="translate(20, 20)">
        <rect width="290" height="240" rx="10" fill="var(--surface-card, #ffffff)" stroke="#2563eb" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#1d4ed8">A WORKSPACE = A TEXT FOLDER</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">agents.yaml   — who is on the crew</text>
        <text x="16" y="76" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">tasks.yaml    — the work to do</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">crew.py       — the @CrewBase binding</text>
        <text x="16" y="116" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">tools/        — tool source</text>
        <text x="16" y="136" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">knowledge/    — known documents</text>
        <text x="16" y="156" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">skills/       — SKILL.md files</text>
        <rect x="16" y="174" width="258" height="50" rx="6" fill="#10b981" fill-opacity="0.12"/>
        <text x="24" y="193" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#059669">SHIPS RUNNABLE, NOT EMPTY</text>
        <text x="24" y="210" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">A new workspace runs a real crew,</text>
        <text x="24" y="224" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">so the intended shape is demonstrated.</text>
      </g>

      <g transform="translate(330, 20)">
        <rect width="270" height="240" rx="10" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#6d28d9">THE BINDING, BY NAME</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">YAML says "researcher".</text>
        <text x="16" y="76" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Python holds the live object.</text>
        <text x="16" y="98" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">crew_base.py:621-671 resolves it,</text>
        <text x="16" y="116" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">falling back to the raw string.</text>
        <text x="16" y="142" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">ONE DEFINITION, 3 SYNTAXES</text>
        <text x="16" y="162" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Decorators · JSON · YAML all build</text>
        <text x="16" y="180" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">the same CrewDefinition:297.</text>
        <rect x="16" y="196" width="238" height="30" rx="6" fill="#7c3aed" fill-opacity="0.10"/>
        <text x="24" y="215" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The cleanest answer seen to config-vs-code.</text>
      </g>

      <g transform="translate(620, 20)">
        <rect width="280" height="240" rx="10" fill="var(--surface-card, #ffffff)" stroke="#b45309" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#b45309">WHERE THE MODEL STOPS</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Files are a real 4-part subsystem:</text>
        <text x="16" y="78" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">coerce → constrain → format → upload</text>
        <text x="16" y="96" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">FileMode: strict / auto / warn / chunk</text>
        <text x="16" y="118" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Knowledge: 10 source types, by similarity</text>
        <rect x="16" y="136" width="248" height="88" rx="6" fill="#f59e0b" fill-opacity="0.12"/>
        <text x="24" y="156" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#b45309">THE GAP (F3-12)</text>
        <text x="24" y="174" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The workspace holds FILES that</text>
        <text x="24" y="190" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">describe agents. It never holds</text>
        <text x="24" y="206" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">agents as records. Two different</text>
        <text x="24" y="220" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">objects — do not conflate them.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE — POLE 3</div>
    <h4>Automations: an excellent executor with no delivery layer</h4>
    <p>Work does not arrive in CrewAI — it is started. What it does give is a declared workflow graph and a credible durability store</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 380" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('04')}
      <rect x="20" y="20" width="880" height="58" rx="10" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="46" font-family="system-ui, sans-serif" font-size="13.5" font-weight="700" fill="#b91c1c">THE HEADLINE: no scheduler, no queue, no worker, no clock — measured by direct search, not inferred.</text>
      <text x="40" y="66" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Redis appears only as a lock and a cache, never a job broker. Work runs when a developer's process calls kickoff().</text>

      ${card(20, 95, 285, 165, 'WHAT IS ABSENT', [
        '• no queue / broker / worker pool',
        '• no cron, scheduler or clock',
        '• no retry, backoff or expiry',
        '• no ownership of pending work',
        { text: 'A paused run nobody resumes stays paused.', color: '#b91c1c' }
      ], { sw: 1.6, stroke: '#ef4444', titleColor: '#b91c1c' })}
      ${card(320, 95, 285, 165, 'WHAT IS GENUINELY GOOD', [
        '• Flow: a declared method graph',
        '• or_ / and_ with first-wins racing',
        '• Progress = a set of completed names',
        '• plot() → standalone HTML',
        { text: 'The graph is executed AND drawn.', color: '#059669' }
      ], { sw: 1.6, stroke: '#10b981', titleColor: '#047857' })}
      ${card(620, 95, 280, 165, 'THE DURABILITY STORE', [
        '• @persist: append-only rows',
        '• CheckpointConfig: whole-run snapshots',
        '• resume / fork(branch=…)',
        '• restored run gets a FRESH id',
        { text: '…but the engine FORBIDS combining them.', color: '#b45309' }
      ], { sw: 1.6, stroke: '#7c3aed', titleColor: '#6d28d9' })}

      <g transform="translate(20, 278)">
        <rect width="430" height="88" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
        <text x="16" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">THE ONE "WAIT FOR THE OUTSIDE" PRIMITIVE</text>
        <text x="16" y="48" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A pending_feedback row plus from_pending(flow_id).resume(text) —</text>
        <text x="16" y="66" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">whose own docstring names a webhook handler as the caller,</text>
        <text x="16" y="82" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#b45309">because nothing in CrewAI does.</text>
      </g>

      <g transform="translate(470, 278)">
        <rect width="430" height="88" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
        <text x="16" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">THE RACING RULE WORTH COPYING</text>
        <text x="16" y="48" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Only exclusively-fed alternatives race. Cancelling a member of an</text>
        <text x="16" y="66" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">and_ would make it unsatisfiable forever — the source documents it</text>
        <text x="16" y="82" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">in its own comment. Non-obvious, already correct.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE — WIDGETS &amp; FRONTEND</div>
    <h4>An empty frontend, and the only real widget architecture found in the study</h4>
    <p>A2UI: a four-message protocol, an 18-component typed catalogue, and a permission rule enforced on the way OUT</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('05')}
      ${card(20, 20, 210, 145, 'THERE IS NO FRONTEND', [
        'No package.json, no bundler',
        'No JS or TS anywhere',
        'No HTML app, no renderer',
        { text: 'The whole layer is ours', color: '#b91c1c' }
      ], { sw: 1.6, stroke: '#ef4444', titleColor: '#b91c1c' })}
      ${card(245, 20, 210, 145, 'A2UI — 4 MESSAGES', [
        'BeginRendering · SurfaceUpdate',
        'DataModelUpdate · DeleteSurface',
        'models.py:106/123/134/148',
        { text: 'A render tree + data model', color: '#6d28d9' }
      ], { sw: 1.6, stroke: '#7c3aed', titleColor: '#6d28d9' })}
      ${card(470, 20, 210, 145, '18 TYPED COMPONENTS', [
        'Ordinary UI primitives',
        'Bindings, composition, actions',
        'Data addressed by path (BoundValue)',
        { text: 'A bounded, closed vocabulary', color: '#1d4ed8' }
      ], { sw: 1.6, stroke: '#2563eb', titleColor: '#1d4ed8' })}
      ${card(695, 20, 205, 145, 'PROMPT-AUGMENTED', [
        'inject_tools is a no-op',
        'The UI request rides in the prompt',
        'client_extension.py:212-213',
        { text: 'A deliberate choice, not tool calls', color: '#b45309' }
      ], { sw: 1.6, stroke: '#f59e0b', titleColor: '#b45309' })}

      <rect x="20" y="185" width="430" height="145" rx="10" fill="#10b981" fill-opacity="0.09" stroke="#10b981" stroke-width="1.6"/>
      <text x="40" y="213" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#047857">THE KEY IDEA: allowed_components enforced on the RESPONSE</text>
      <text x="40" y="239" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">A widget subset is not merely advertised in the prompt — it is checked</text>
      <text x="40" y="259" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">when the answer comes back (client_extension.py:397, :426).</text>
      <text x="40" y="283" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#059669">This is the only real enforcement mechanism found anywhere in the study.</text>
      <text x="40" y="311" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-muted, #64748b)">Two protocol generations sit side by side; their deltas are the design decisions.</text>

      <g transform="translate(470, 185)">
        <rect width="430" height="145" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
        <text x="20" y="28" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="var(--text-primary, #0f172a)">THE OTHER SURFACES (all outside the web)</text>
        <text x="20" y="54" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A 3,278-line terminal TUI — a live subscriber to the event bus</text>
        <text x="20" y="76" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• flow.plot() — draws the flow from the same definition it runs</text>
        <text x="20" y="98" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A Mintlify docs site it does not build</text>
        <rect x="20" y="112" width="390" height="20" rx="4" fill="#7c3aed" fill-opacity="0.10"/>
        <text x="28" y="126" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Take the vocabulary + the subsetting rule. Build the renderer and the frontend.</text>
      </g>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE — OUT-OF-POLE (PZ)</div>
    <h4>The tenancy question, closed — and the surfaces that still matter</h4>
    <p>Three of the four purposes a tenancy model is made of are literal TODOs in the shipped source</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 350" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('06')}
      <rect x="20" y="20" width="880" height="120" rx="10" fill="#ef4444" fill-opacity="0.07" stroke="#ef4444" stroke-width="1.6"/>
      <text x="40" y="48" font-family="system-ui, sans-serif" font-size="13.5" font-weight="700" fill="#b91c1c">SecurityConfig — 274 lines across four files, and its own docstring admits the gaps</text>
      <text x="40" y="74" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Authentication credentials … *TODO*  (security_config.py:25)</text>
      <text x="40" y="94" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Scoping rules … *TODO*  (:27)          • Impersonation / delegation tokens … *TODO*  (:28)</text>
      <text x="40" y="118" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#b91c1c">The only field that exists is fingerprint — who you are, what you may see, acting for someone: all unimplemented.</text>
      <text x="40" y="134" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-muted, #64748b)">Those three ARE a tenancy model. The word "tenant" appears in twelve files; not one is a tenancy model.</text>

      ${card(20, 155, 210, 175, 'IDENTITY (the one that IS built)', [
        'Dual id: readable name + uuid',
        'fingerprint.py:41-50',
        'Random by default',
        'DETERMINISTIC from a seed (uuid5)',
        { text: 'Stable identity, no database', color: '#059669' }
      ], { sw: 1.4, stroke: '#10b981', titleColor: '#047857' })}
      ${card(245, 155, 210, 175, 'AUTH WITHOUT AUTHORIZATION', [
        'Five pure OAuth providers',
        'base_provider.py:10-46',
        'They log you IN',
        'Nothing decides what you may DO',
        { text: 'No roles, no scopes, no policy', color: '#b45309' }
      ], { sw: 1.4, stroke: '#f59e0b', titleColor: '#b45309' })}
      ${card(470, 155, 210, 175, 'TELEMETRY & THE ENTERPRISE', [
        'OTLP, opt-out',
        'A checkable privacy claim in-source',
        'telemetry.py:1-9',
        'Enterprise = a token vs a remote service',
        { text: 'Not data partitioning', color: '#6d28d9' }
      ], { sw: 1.4, stroke: '#7c3aed', titleColor: '#6d28d9' })}
      ${card(695, 155, 205, 175, 'THE UNUSED SEAM', [
        'ToolFilterContext is well-shaped',
        'mcp/filters.py:17-26',
        'and unpopulated',
        'A tenant would go here',
        { text: 'A wiring task for us', color: '#1d4ed8' }
      ], { sw: 1.4, stroke: '#2563eb', titleColor: '#1d4ed8' })}
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE — STRATEGIC DECISION</div>
    <h4>The synthesis: what to take, what it does not give us, and the verdict</h4>
    <p>The transfer matrix that closes the CrewAI study and feeds the coming cross-platform mapping step</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 360" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('07')}
      <g transform="translate(20, 20)">
        <rect width="430" height="165" rx="10" fill="#10b981" fill-opacity="0.09" stroke="#10b981" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#047857">★ TAKE — ranked mechanisms</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">1 · Widget catalogue + allowed_components enforcement (PX-W)</text>
        <text x="16" y="74" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">2 · Progress as a set of completed names (P3)</text>
        <text x="16" y="92" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">3 · First-wins or_ racing, with the and_ rule (P3)</text>
        <text x="16" y="110" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">4 · Deterministic identity from a seed (P1)</text>
        <text x="16" y="128" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">5 · The typed tool-failure precedent chain (P1)</text>
        <text x="16" y="146" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">… 12 ranked mechanisms in total (§7.3)</text>
        <text x="16" y="162" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#059669">The top three are about bounded vocabulary and honest state — not scale.</text>
      </g>

      <g transform="translate(470, 20)">
        <rect width="430" height="165" rx="10" fill="#ef4444" fill-opacity="0.07" stroke="#ef4444" stroke-width="1.6"/>
        <text x="16" y="30" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#b91c1c">✗ DO NOT ASSUME — it does not give us</text>
        <text x="16" y="56" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Tenancy of any kind — none, at any layer</text>
        <text x="16" y="74" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Authorization / roles — login only</text>
        <text x="16" y="92" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Agent as a stored record — computed, never filed</text>
        <text x="16" y="110" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Organisation / reporting structure</text>
        <text x="16" y="128" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A queue, worker, scheduler or clock</text>
        <text x="16" y="146" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• A web frontend, or a renderer for A2UI</text>
        <text x="16" y="162" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#b91c1c">These are BUILD, not adapt — before the mapping pass looks at any row.</text>
      </g>

      <rect x="20" y="200" width="880" height="140" rx="10" fill="#7c3aed" fill-opacity="0.08" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="40" y="228" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">THE VERDICT IN ONE PARAGRAPH: mechanism donor, not architecture template</text>
      <text x="40" y="254" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">CrewAI is a mature, well-abstracted Python framework for declaring and executing agent workflows on one machine for one owner.</text>
      <text x="40" y="274" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Its scope ends precisely where our hard problems begin: no tenancy, no authorization, no agent records, no org, no queue, no delivery.</text>
      <text x="40" y="298" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#6d28d9">Take the cheques it writes; build the ownership and delivery layers ourselves, without looking for a model of them here.</text>
      <text x="40" y="322" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-muted, #64748b)">Where this study's 67 findings collide with a candidate platform's, the collision is recorded — not smoothed (rule 13).</text>
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
  { id: 'master', batchNum: 'all', title: 'Executive Topology: three poles, one executor, two absent clusters', category: 'Strategic Architecture', description: 'The three poles, what CrewAI gives each, and the two clusters it does not have — the whole study on one page.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the 93% docs hazard, and the method', category: 'Foundations', description: 'An extract not a clone, the documentation hazard (33,251 .mdx), the code scale, and the 10-rule method.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The one door, the spine & the second paradigm', category: 'Foundations', description: 'Four nouns, kickoff() as the one door, the 163-event bus with hooks, and Flow as the graph paradigm.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant — a small agent & an empty seam', category: 'Pole 1 — The Aissistant', description: 'Persona as three strings, capability as six methods, the ReAct loop, typed failure — and the unpopulated tool filter.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace — a folder that binds text to code', category: 'Pole 2 — The Workspace', description: 'The runnable folder, YAML↔Python string-reference resolution, the crewai-files subsystem, and the record gap.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations — executor yes, delivery no', category: 'Pole 3 — Automations', description: 'No queue, scheduler or clock; the Flow graph with racing semantics, completed-name progress, and a durability store.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets & frontend — empty front, real protocol', category: 'Cross-Cutting', description: 'No frontend at all; A2UI — four messages, 18 components, and allowed_components enforced on the response.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole (PZ) — the tenancy question, closed', category: 'Escape Hatch', description: 'SecurityConfig marks auth, scoping and impersonation TODO; seed identity, auth without authorization, telemetry.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis — transfer matrix & the verdict', category: 'Strategic Decision', description: '12 ranked mechanisms, 13 absent capabilities, both value questions answered, and the platform verdict.' }
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
