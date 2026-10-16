// High-precision SVG diagrams for each batch of the Hermes Forensics study.
// Adaptive colors using CSS custom properties for seamless Light, Dark, Sepia, and Midnight themes.

function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>Forensic Study Topology: Nous Hermes vs Enterprise Platform</h4>
    <p>Strategic comparison of systems, verification boundaries, and the Build AROUND blueprint</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 480" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="gEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#047857" stop-opacity="0.05"/>
        </linearGradient>
        <linearGradient id="gPurple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#6d28d9" stop-opacity="0.05"/>
        </linearGradient>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--diagram-accent, #3b82f6)"/>
        </marker>
        <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981"/>
        </marker>
      </defs>

      <!-- Outer Boundary: Our Enterprise Platform -->
      <rect x="20" y="20" width="920" height="440" rx="16" fill="url(#gBlue)" stroke="var(--diagram-accent, #3b82f6)" stroke-width="2" stroke-dasharray="6,4"/>
      <text x="45" y="55" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="var(--diagram-accent, #3b82f6)">OUR PLATFORM: ENTERPRISE BUSINESS &amp; RESOURCES PLANNER</text>
      <text x="45" y="75" font-family="system-ui, sans-serif" font-size="12" fill="var(--text-muted, #64748b)">Multi-Tenant Boundary • Company RBAC • Scoreboard Discipline • Commercial Isolation</text>

      <!-- Column 1: Outermost Platform Door -->
      <g transform="translate(45, 105)">
        <rect width="240" height="150" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.5"/>
        <rect x="12" y="12" width="70" height="20" rx="4" fill="#3b82f6" fill-opacity="0.15"/>
        <text x="18" y="26" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#2563eb">DOOR 1</text>
        <text x="12" y="52" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">Multi-Tenancy Key</text>
        <text x="12" y="72" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Hard tenant isolation boundary</text>
        <text x="12" y="90" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Customer billing &amp; data residency</text>
        <text x="12" y="108" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Zero cross-tenant data leaks</text>
        <rect x="12" y="122" width="216" height="18" rx="4" fill="#10b981" fill-opacity="0.15"/>
        <text x="20" y="135" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">Our Platform Advantage (§2.1)</text>
      </g>

      <g transform="translate(45, 275)">
        <rect width="240" height="160" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.5"/>
        <rect x="12" y="12" width="70" height="20" rx="4" fill="#3b82f6" fill-opacity="0.15"/>
        <text x="18" y="26" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#2563eb">DOOR 2</text>
        <text x="12" y="52" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--text-primary, #0f172a)">Typed Engine Port</text>
        <text x="12" y="68" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#2563eb">Row 28: lib/ai-runtime-port.ts</text>
        <text x="12" y="88" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Exactly 8 typed operations</text>
        <text x="12" y="106" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Engine swappable by proof</text>
        <text x="12" y="124" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">• Definition-of-Done contracts</text>
        <rect x="12" y="132" width="216" height="18" rx="4" fill="#10b981" fill-opacity="0.15"/>
        <text x="20" y="145" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">Row 28 Port is non-negotiable (§2.2)</text>
      </g>

      <!-- Connecting arrows -->
      <path d="M 285 180 L 330 180 L 330 270 L 350 270" stroke="var(--diagram-accent, #3b82f6)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>
      <path d="M 285 350 L 350 350" stroke="var(--diagram-accent, #3b82f6)" stroke-width="2" fill="none" marker-end="url(#arrow)"/>

      <!-- Inner Box: Hermes as an Engine Adapter -->
      <rect x="360" y="90" width="555" height="345" rx="12" fill="url(#gEmerald)" stroke="#10b981" stroke-width="2"/>
      <text x="385" y="122" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="#059669">HERMES ENGINE ADAPTER (Nous Research — Pinned Tree)</text>
      <text x="385" y="140" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">19,728 Files • 455 Docs (8.9 MB) • 1,819 Python Modules (698k LOC) • Single-Operator Architecture</text>

      <!-- Subsystems inside Hermes -->
      <!-- Top Row inside Hermes -->
      <g transform="translate(385, 160)">
        <rect width="160" height="110" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
        <text x="10" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Execution Engine</text>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Alternation Repair (b01)</text>
        <text x="10" y="60" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• DaemonThreadPool (b01)</text>
        <text x="10" y="76" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Budget 500 / refund (b01)</text>
        <text x="10" y="94" font-family="system-ui, sans-serif" font-size="10.5" fill="#059669">Primary/Auxiliary Split</text>
      </g>

      <g transform="translate(560, 160)">
        <rect width="175" height="110" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
        <text x="10" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Security &amp; Sandboxing</text>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Hardline Floor (b08)</text>
        <text x="10" y="60" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Docker (pids 2048) (b08)</text>
        <text x="10" y="76" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Context Approvals (b08)</text>
        <text x="10" y="94" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#059669">★ Take into Platform</text>
      </g>

      <g transform="translate(750, 160)">
        <rect width="145" height="110" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.8"/>
        <text x="10" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">iron-proxy</text>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Credential Injection</text>
        <text x="10" y="60" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Dummy token egress</text>
        <text x="10" y="76" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Zero secret leak (b11)</text>
        <text x="10" y="96" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#059669">STRONGEST DESIGN</text>
      </g>

      <!-- Bottom Row inside Hermes -->
      <g transform="translate(385, 285)">
        <rect width="160" height="130" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
        <text x="10" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Intelligence &amp; Skills</text>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 3-Way Learn Loop (b03)</text>
        <text x="10" y="60" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• /learn extraction (b03)</text>
        <text x="10" y="76" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Curator hygiene (b03)</text>
        <text x="10" y="92" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 4-tier memory (b04)</text>
        <text x="10" y="112" font-family="system-ui, sans-serif" font-size="10" fill="#64748b">Dynamic Tail Sizing</text>
      </g>

      <g transform="translate(560, 285)">
        <rect width="175" height="130" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
        <text x="10" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Orchestration &amp; Tools</text>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Cron ticks + retry (b06)</text>
        <text x="10" y="60" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Child cap 250 (b06)</text>
        <text x="10" y="76" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• /goal judge gate (b06)</text>
        <text x="10" y="92" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• MCP Gateway &amp; Trust (b05)</text>
        <text x="10" y="112" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">★ Take Cron rate-limit</text>
      </g>

      <g transform="translate(750, 285)">
        <rect width="145" height="130" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.2"/>
        <text x="10" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Extensibility</text>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 17 Plugin kinds (b10)</text>
        <text x="10" y="60" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Compat contract (b10)</text>
        <text x="10" y="76" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Shrinking core (b10)</text>
        <text x="10" y="92" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 35 Channels (b11)</text>
        <text x="10" y="112" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">★ Take Plugin contract</text>
      </g>

    </svg>
  </div>
</div>`;
}

function getBatchDiagram(batchNum) {
  switch (batchNum) {
    case '00':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 00 VISUAL GUIDE</div>
    <h4>Forensic Verification Pipeline &amp; Codebase Distribution</h4>
    <p>How claims in 455 documents (8.9 MB) were systematically verified against 1,819 Python files (698k LOC)</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 280" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-b0" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#3b82f6"/>
        </marker>
      </defs>

      <!-- Step 1: Pinned Snapshot -->
      <g transform="translate(20, 30)">
        <rect width="180" height="100" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">STEP 1: THE PIN</text>
        <text x="15" y="52" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">19,728 Files</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">md5: f57f729d4b251547...</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="#059669">Snapshot: 2026-10-15</text>
      </g>

      <path d="M 200 80 L 235 80" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Step 2: Doc Claim Extraction -->
      <g transform="translate(245, 30)">
        <rect width="180" height="100" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">STEP 2: DOC CLAIM</text>
        <text x="15" y="52" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">455 Markdown Docs</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">8.9 MB in website/docs/</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="#d97706">Claim = Hypothesis</text>
      </g>

      <path d="M 425 80 L 460 80" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Step 3: Source Verification -->
      <g transform="translate(470, 30)">
        <rect width="200" height="100" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">STEP 3: CODE IS KING</text>
        <text x="15" y="52" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">1,819 Python Files</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">698,487 Source Lines</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="#059669">AST / Function Lines</text>
      </g>

      <path d="M 670 80 L 705 80" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Step 4: Outcome & Divergences -->
      <g transform="translate(715, 30)">
        <rect width="185" height="100" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.5"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#059669">STEP 4: FINDINGS</text>
        <text x="15" y="52" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">Verified vs Divergent</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Code wins every dispute</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="#dc2626">4 Real Divergences</text>
      </g>

      <!-- Bottom Distribution Bar -->
      <g transform="translate(20, 160)">
        <text x="0" y="15" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Python Source Code Distribution (698,487 Total Lines)</text>
        
        <!-- Stacked Bar -->
        <rect x="0" y="28" width="370" height="24" rx="4" fill="#3b82f6"/>
        <text x="10" y="44" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#ffffff">hermes_cli (285k)</text>

        <rect x="375" y="28" width="180" height="24" rx="4" fill="#10b981"/>
        <text x="385" y="44" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#ffffff">agent (140k)</text>

        <rect x="560" y="28" width="160" height="24" rx="4" fill="#8b5cf6"/>
        <text x="570" y="44" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#ffffff">tools (126k)</text>

        <rect x="725" y="28" width="155" height="24" rx="4" fill="#f59e0b"/>
        <text x="735" y="44" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#ffffff">gateway (122k)</text>

        <text x="0" y="75" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Remaining Subsystems: plugins (76k) • tui_gateway (45k) • cron (19k) • skills (12k) • acp_adapter (6k)</text>
      </g>
    </svg>
  </div>
</div>`;

    case '01':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 VISUAL GUIDE</div>
    <h4>The Hermes Agent Loop Execution Sequence</h4>
    <p>Verified code flow inside agent/conversation_loop.py and agent/tool_executor.py</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 320" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-b1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#3b82f6"/>
        </marker>
        <marker id="arr-loop" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#8b5cf6"/>
        </marker>
      </defs>

      <!-- Step 1: Input & Alternation Repair -->
      <g transform="translate(20, 20)">
        <rect width="150" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb">1. MESSAGE INGEST</text>
        <text x="12" y="44" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Alternation Repair</text>
        <text x="12" y="62" font-family="system-ui, sans-serif" font-size="10" fill="var(--text-secondary, #475569)">agent_runtime_helpers</text>
        <text x="12" y="78" font-family="system-ui, sans-serif" font-size="10" fill="#059669">Merges consecutive roles</text>
      </g>

      <path d="M 170 65 L 200 65" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b1)"/>

      <!-- Step 2: Preflight Gate -->
      <g transform="translate(210, 20)">
        <rect width="150" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb">2. PREFLIGHT GATE</text>
        <text x="12" y="44" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Context Compressor</text>
        <text x="12" y="62" font-family="system-ui, sans-serif" font-size="10" fill="var(--text-secondary, #475569)">Runs if history &gt; 50% ctx</text>
        <text x="12" y="78" font-family="system-ui, sans-serif" font-size="10" fill="#059669">Dynamic tail sizing</text>
      </g>

      <path d="M 360 65 L 390 65" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b1)"/>

      <!-- Step 3: LLM API Call -->
      <g transform="translate(400, 20)">
        <rect width="150" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb">3. INTERRUPTIBLE API</text>
        <text x="12" y="44" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Provider Dialect</text>
        <text x="12" y="62" font-family="system-ui, sans-serif" font-size="10" fill="var(--text-secondary, #475569)">Converted to shape</text>
        <text x="12" y="78" font-family="system-ui, sans-serif" font-size="10" fill="#059669">Streaming + Abort hook</text>
      </g>

      <path d="M 550 65 L 590 65" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b1)"/>

      <!-- Step 4: Decision: Plain Text vs Tools -->
      <g transform="translate(600, 25)">
        <polygon points="65,0 130,40 65,80 0,40" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.8"/>
        <text x="38" y="38" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#6d28d9">Has Tool</text>
        <text x="44" y="52" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#6d28d9">Calls?</text>
      </g>

      <!-- Branch: No -> Answer & Save -->
      <path d="M 730 65 L 770 65" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b1)"/>
      <g transform="translate(775, 20)">
        <rect width="125" height="90" rx="8" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="1.5"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#047857">ANSWER</text>
        <text x="12" y="44" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Save Session</text>
        <text x="12" y="62" font-family="system-ui, sans-serif" font-size="10" fill="var(--text-secondary, #475569)">Post-turn hooks</text>
        <text x="12" y="78" font-family="system-ui, sans-serif" font-size="10" fill="#059669">Turn Complete ✓</text>
      </g>

      <!-- Branch: Yes -> Tool Executor -->
      <path d="M 665 105 L 665 150" stroke="#8b5cf6" stroke-width="2" marker-end="url(#arr-loop)"/>
      <g transform="translate(480, 160)">
        <rect width="370" height="120" rx="8" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.5"/>
        <text x="15" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">TOOL EXECUTOR (agent/tool_executor.py)</text>
        <rect x="15" y="38" width="165" height="42" rx="4" fill="var(--bg-main, #f8fafc)" stroke="var(--border-color, #e2e8f0)"/>
        <text x="22" y="55" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="var(--text-primary, #0f172a)">Parallel Execution</text>
        <text x="22" y="70" font-family="system-ui, sans-serif" font-size="9.5" fill="var(--text-secondary, #475569)">DaemonThreadPoolExecutor</text>

        <rect x="190" y="38" width="165" height="42" rx="4" fill="var(--bg-main, #f8fafc)" stroke="var(--border-color, #e2e8f0)"/>
        <text x="198" y="55" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="var(--text-primary, #0f172a)">Sequential Exception</text>
        <text x="198" y="70" font-family="system-ui, sans-serif" font-size="9.5" fill="var(--text-secondary, #475569)">Single or interactive calls</text>

        <rect x="15" y="88" width="340" height="22" rx="4" fill="#3b82f6" fill-opacity="0.1"/>
        <text x="22" y="103" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#1d4ed8">Budget Check: 500 max • IterationBudget.refund() for execute_code</text>
      </g>

      <!-- Loopback arrow -->
      <path d="M 480 220 L 285 220 L 285 120" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="5,4" fill="none" marker-end="url(#arr-loop)"/>
      <text x="310" y="240" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">Loop back with tool results (think → act → observe)</text>
    </svg>
  </div>
</div>`;

    case '02':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 VISUAL GUIDE</div>
    <h4>Profile Isolation Boundary vs Sandbox Reality</h4>
    <p>Profiles provide directory-level separation, NOT process or OS security sandboxing</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 250" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Profile 1 -->
      <g transform="translate(30, 20)">
        <rect width="260" height="200" rx="10" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#2563eb">Profile: Alice (~/.hermes/profiles/alice)</text>
        <text x="15" y="55" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• config.yaml (custom prompt, model)</text>
        <text x="15" y="75" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• memory/ (dedicated MEMORY.md)</text>
        <text x="15" y="95" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• skills/ (isolated local skills)</text>
        <text x="15" y="115" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• tools/ (custom enabled toolset)</text>
        <rect x="15" y="140" width="230" height="42" rx="6" fill="#10b981" fill-opacity="0.12"/>
        <text x="25" y="158" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">Bot Persona: Alice</text>
        <text x="25" y="174" font-family="system-ui, sans-serif" font-size="9.5" fill="#047857">Auto-attributed: [Agent: Alice]</text>
      </g>

      <!-- Center: Shared State & Routing -->
      <g transform="translate(330, 45)">
        <rect width="250" height="150" rx="10" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.5"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">Shared State &amp; Group Chat</text>
        <text x="15" y="50" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="var(--text-primary, #0f172a)">shared-state.db</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• message_agent tool routing</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Room member rosters</text>
        <text x="15" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• hermes peer (cross-machine)</text>
        <rect x="15" y="116" width="220" height="22" rx="4" fill="#f59e0b" fill-opacity="0.15"/>
        <text x="22" y="131" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#b45309">Same OS User &amp; Filesystem</text>
      </g>

      <!-- Profile 2 -->
      <g transform="translate(620, 20)">
        <rect width="260" height="200" rx="10" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#2563eb">Profile: Bob (~/.hermes/profiles/bob)</text>
        <text x="15" y="55" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• config.yaml (custom prompt, model)</text>
        <text x="15" y="75" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• memory/ (dedicated MEMORY.md)</text>
        <text x="15" y="95" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• skills/ (isolated local skills)</text>
        <text x="15" y="115" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• tools/ (custom enabled toolset)</text>
        <rect x="15" y="140" width="230" height="42" rx="6" fill="#10b981" fill-opacity="0.12"/>
        <text x="25" y="158" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">Bot Persona: Bob</text>
        <text x="25" y="174" font-family="system-ui, sans-serif" font-size="9.5" fill="#047857">Auto-attributed: [Agent: Bob]</text>
      </g>
    </svg>
  </div>
</div>`;

    case '03':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 VISUAL GUIDE</div>
    <h4>The Three-Way Self-Improving Learning Loop</h4>
    <p>How the agent extracts experience, proposes skills, undergoes human review, and cures the library</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 230" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Step 1: Experience -->
      <g transform="translate(30, 40)">
        <circle cx="50" cy="50" r="45" fill="#3b82f6" fill-opacity="0.15" stroke="#3b82f6" stroke-width="2"/>
        <text x="50" y="46" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb">LIVE</text>
        <text x="50" y="62" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb">EXPERIENCE</text>
      </g>

      <!-- Arrow 1 -->
      <path d="M 135 90 L 190 90" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>
      <text x="162" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#64748b">/learn</text>

      <!-- Step 2: Skill Proposal -->
      <g transform="translate(200, 30)">
        <rect width="180" height="120" rx="8" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.5"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">Skill Proposal</text>
        <text x="12" y="48" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• YAML metadata block</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Trigger patterns</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Step-by-step instructions</text>
        <text x="12" y="104" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">Synthesized from session</text>
      </g>

      <!-- Arrow 2 -->
      <path d="M 390 90 L 440 90" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Step 3: Human Approval Gate -->
      <g transform="translate(450, 30)">
        <rect width="170" height="120" rx="8" fill="var(--surface-card, #ffffff)" stroke="#f59e0b" stroke-width="1.8"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b45309">Human Write Gate</text>
        <text x="12" y="48" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Explicit diff review</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Cannot write silently</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Human in the loop</text>
        <rect x="10" y="94" width="150" height="18" rx="3" fill="#10b981" fill-opacity="0.15"/>
        <text x="18" y="106" font-family="system-ui, sans-serif" font-size="9.5" font-weight="700" fill="#047857">SAFETY GUARANTEE</text>
      </g>

      <!-- Arrow 3 -->
      <path d="M 630 90 L 680 90" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Step 4: Library & Curator -->
      <g transform="translate(690, 30)">
        <rect width="195" height="120" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.5"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">Skill Library &amp; Curator</text>
        <text x="12" y="48" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• ~/.hermes/skills/*.md</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Background curator job</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Deduplication &amp; pruning</text>
        <text x="12" y="104" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#2563eb">Prompt Injection on match</text>
      </g>

      <!-- Loop feedback -->
      <path d="M 780 160 L 780 190 L 90 190 L 90 140" stroke="#10b981" stroke-width="2" stroke-dasharray="6,4" fill="none" marker-end="url(#arr-green)"/>
      <text x="450" y="205" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#047857">The continuous cycle: Execution → Learning → Human Approval → Curator → Improved Execution</text>
    </svg>
  </div>
</div>`;

    case '04':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 VISUAL GUIDE</div>
    <h4>The 4-Tier Memory &amp; Context Pipeline</h4>
    <p>From immediate token budget compression to permanent vector recall and /journey</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 220" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Tier 1 -->
      <g transform="translate(20, 30)">
        <rect width="200" height="150" rx="8" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">TIER 1: WORKING CONTEXT</text>
        <text x="12" y="50" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="var(--text-primary, #0f172a)">Active Context Window</text>
        <text x="12" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Live token budget</text>
        <text x="12" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Dynamic tail sizing</text>
        <text x="12" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Provider prompt cache</text>
        <rect x="12" y="120" width="176" height="20" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
        <text x="18" y="134" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#1d4ed8">Hot Memory (per-turn)</text>
      </g>

      <!-- Tier 2 -->
      <g transform="translate(245, 30)">
        <rect width="205" height="150" rx="8" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.5"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">TIER 2: COMPRESSOR</text>
        <text x="12" y="50" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="var(--text-primary, #0f172a)">context_compressor.py</text>
        <text x="12" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 335 KB compressor code</text>
        <text x="12" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Triggers &gt; 50% window</text>
        <text x="12" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Prunes older exchanges</text>
        <rect x="12" y="120" width="181" height="20" rx="4" fill="#8b5cf6" fill-opacity="0.12"/>
        <text x="18" y="134" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#6d28d9">Mid-turn guard</text>
      </g>

      <!-- Tier 3 -->
      <g transform="translate(475, 30)">
        <rect width="205" height="150" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.5"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">TIER 3: PERSISTENT MEM</text>
        <text x="12" y="50" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="var(--text-primary, #0f172a)">MEMORY.md (2KB Cap)</text>
        <text x="12" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Fails loudly if exceeded</text>
        <text x="12" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Frozen snapshot pattern</text>
        <text x="12" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• High-signal facts only</text>
        <rect x="12" y="120" width="181" height="20" rx="4" fill="#10b981" fill-opacity="0.12"/>
        <text x="18" y="134" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">Intentional tight budget</text>
      </g>

      <!-- Tier 4 -->
      <g transform="translate(705, 30)">
        <rect width="195" height="150" rx="8" fill="var(--surface-card, #ffffff)" stroke="#f59e0b" stroke-width="1.5"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b45309">TIER 4: SEARCH &amp; JOURNEY</text>
        <text x="12" y="50" font-family="system-ui, sans-serif" font-size="11.5" font-weight="600" fill="var(--text-primary, #0f172a)">Unlimited Recall</text>
        <text x="12" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• /journey timeline</text>
        <text x="12" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Vector similarity search</text>
        <text x="12" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Session history SQLite</text>
        <rect x="12" y="120" width="171" height="20" rx="4" fill="#f59e0b" fill-opacity="0.12"/>
        <text x="18" y="134" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#b45309">Indexed on demand</text>
      </g>
    </svg>
  </div>
</div>`;

    case '05':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 VISUAL GUIDE</div>
    <h4>Tool Registry, MCP Door &amp; Context-Saving Tool Search</h4>
    <p>How Hermes routes requests between built-in tools, MCP servers, and the Nous Tool Gateway</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 220" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Agent Core -->
      <g transform="translate(30, 60)">
        <rect width="180" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#2563eb">Agent Core</text>
        <text x="15" y="50" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="var(--text-primary, #0f172a)">Tool Search Filter</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Injects only matching tools</text>
      </g>

      <path d="M 210 105 L 260 105" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Tool Registry -->
      <g transform="translate(270, 45)">
        <rect width="190" height="120" rx="8" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.8"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">Tool Registry</text>
        <text x="15" y="50" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Platform toolsets</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Dynamic capability check</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">• Trust level verification</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#059669">353 tool files (125k lines)</text>
      </g>

      <!-- Three Destinations -->
      <path d="M 460 75 L 520 40" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr-b0)"/>
      <path d="M 460 105 L 520 105" stroke="#10b981" stroke-width="1.5" marker-end="url(#arr-green)"/>
      <path d="M 460 135 L 520 170" stroke="#f59e0b" stroke-width="1.5" marker-end="url(#arr-b0)"/>

      <!-- Destination 1: In-Tree Python -->
      <g transform="translate(530, 15)">
        <rect width="360" height="52" rx="6" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)"/>
        <text x="12" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">1. Built-in Python Tools</text>
        <text x="12" y="40" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">File ops, bash, python exec, web scrape, search (in-tree)</text>
      </g>

      <!-- Destination 2: MCP Door -->
      <g transform="translate(530, 80)">
        <rect width="360" height="55" rx="6" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.5"/>
        <text x="12" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">2. Model Context Protocol (MCP)</text>
        <text x="12" y="42" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">JSON-RPC, catalog, external tools running in isolated processes</text>
      </g>

      <!-- Destination 3: Nous Tool Gateway -->
      <g transform="translate(530, 148)">
        <rect width="360" height="52" rx="6" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)"/>
        <text x="12" y="22" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b45309">3. Nous Tool Gateway</text>
        <text x="12" y="40" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Hosted convenience proxy for external API tools</text>
      </g>
    </svg>
  </div>
</div>`;

    case '06':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 VISUAL GUIDE</div>
    <h4>Delegation Tree &amp; /goal Completion Contract Gate</h4>
    <p>Parent-to-child iteration caps (with corrected 250 cap) and the 5-field quality gate with LLM judge</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 250" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Left: Delegation Hierarchy -->
      <g transform="translate(20, 20)">
        <rect width="400" height="210" rx="10" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#2563eb">DELEGATION HIERARCHY (delegate_task)</text>
        
        <!-- Parent Box -->
        <rect x="15" y="45" width="370" height="50" rx="6" fill="var(--bg-main, #f8fafc)" stroke="var(--border-color, #cbd5e1)"/>
        <text x="25" y="66" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">Parent Agent</text>
        <text x="25" y="84" font-family="system-ui, sans-serif" font-size="11" fill="#2563eb">Iteration Cap: 500 (max_iterations) • Spawns child tasks</text>

        <!-- Arrow Down -->
        <path d="M 200 95 L 200 120" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

        <!-- Child Box -->
        <rect x="15" y="130" width="370" height="70" rx="6" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="1.5"/>
        <text x="25" y="152" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">Child Subagents</text>
        <text x="25" y="170" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#047857">Iteration Cap: 250 (CORRECTED divergence: docs said 50!)</text>
        <text x="25" y="188" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Isolated session • Own budget • Results bubble up to parent</text>
      </g>

      <!-- Right: /goal Quality Gate -->
      <g transform="translate(450, 20)">
        <rect width="450" height="210" rx="10" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.8"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#6d28d9">/goal COMPLETION CONTRACT GATE</text>

        <g transform="translate(15, 45)">
          <rect width="130" height="60" rx="6" fill="var(--bg-main, #f8fafc)" stroke="var(--border-color, #cbd5e1)"/>
          <text x="10" y="22" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="var(--text-primary, #0f172a)">1. Contract Fields</text>
          <text x="10" y="38" font-family="system-ui, sans-serif" font-size="9.5" fill="var(--text-secondary, #475569)">5 completion</text>
          <text x="10" y="52" font-family="system-ui, sans-serif" font-size="9.5" fill="var(--text-secondary, #475569)">field criteria</text>
        </g>

        <path d="M 150 75 L 175 75" stroke="#8b5cf6" stroke-width="2" marker-end="url(#arr-loop)"/>

        <g transform="translate(180, 45)">
          <rect width="120" height="60" rx="6" fill="var(--bg-main, #f8fafc)" stroke="var(--border-color, #cbd5e1)"/>
          <text x="10" y="22" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="var(--text-primary, #0f172a)">2. Exit-0 Gate</text>
          <text x="10" y="38" font-family="system-ui, sans-serif" font-size="9.5" fill="var(--text-secondary, #475569)">Test command</text>
          <text x="10" y="52" font-family="system-ui, sans-serif" font-size="9.5" fill="var(--text-secondary, #475569)">3 retries / 5 min</text>
        </g>

        <path d="M 305 75 L 330 75" stroke="#8b5cf6" stroke-width="2" marker-end="url(#arr-loop)"/>

        <g transform="translate(335, 45)">
          <rect width="100" height="60" rx="6" fill="#10b981" fill-opacity="0.12" stroke="#10b981"/>
          <text x="8" y="22" font-family="system-ui, sans-serif" font-size="10.5" font-weight="700" fill="#047857">3. LLM Judge</text>
          <text x="8" y="38" font-family="system-ui, sans-serif" font-size="9.5" fill="#047857">Verifies proof</text>
          <text x="8" y="52" font-family="system-ui, sans-serif" font-size="9.5" fill="#047857">before finish</text>
        </g>

        <rect x="15" y="125" width="420" height="75" rx="6" fill="#3b82f6" fill-opacity="0.08"/>
        <text x="25" y="145" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#2563eb">Session-Scoped Trio Comparison:</text>
        <text x="25" y="165" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• /goal — Judge-driven loop with hard proof contracts</text>
        <text x="25" y="183" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• /loop — Timer-driven repeated execution • /heartbeat — Recurring prompt</text>
      </g>
    </svg>
  </div>
</div>`;

    case '07':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 VISUAL GUIDE</div>
    <h4>24-Platform Unified Session Pipeline &amp; Dashboard</h4>
    <p>One unified taxonomy across 24 message sources, SQLite storage, and 99 config sections / 816 keys</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 220" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- 24 Platforms -->
      <g transform="translate(30, 30)">
        <rect width="220" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">INCOMING PLATFORMS</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">~24 Source Platforms</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">CLI, Web, TUI, Telegram,</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Discord, Slack, WhatsApp,</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Signal, Matrix, Email, REST...</text>
        <rect x="15" y="125" width="190" height="22" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
        <text x="22" y="140" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#1d4ed8">Normalized Session Model</text>
      </g>

      <path d="M 250 110 L 300 110" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-b0)"/>

      <!-- Session Engine -->
      <g transform="translate(310, 30)">
        <rect width="260" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">SESSION LIFECYCLE ENGINE</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">SQLite Durable Store</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Resume, naming &amp; fork lineage</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Automatic retention &amp; prune</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Guards fail closed</text>
        <rect x="15" y="125" width="230" height="22" rx="4" fill="#10b981" fill-opacity="0.12"/>
        <text x="22" y="140" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">Repairs ask operator first</text>
      </g>

      <path d="M 570 110 L 620 110" stroke="#10b981" stroke-width="2" marker-end="url(#arr-green)"/>

      <!-- Dashboard Surface -->
      <g transform="translate(630, 30)">
        <rect width="260" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">ADMIN DASHBOARD</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="var(--text-primary, #0f172a)">Configuration Surface</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#dc2626">Divergence Measured:</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Docs said: "150+ config fields"</text>
        <text x="15" y="106" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#059669">Code has: 99 sections / 816 keys</text>
        <rect x="15" y="125" width="230" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.12"/>
        <text x="22" y="140" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#6d28d9">Full REST management API</text>
      </g>
    </svg>
  </div>
</div>`;

    case '08':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 08 VISUAL GUIDE</div>
    <h4>Hermes 4-Tier Security &amp; Sandboxing Defense Matrix</h4>
    <p>From the non-overridable Hardline Floor down to Docker containerization and secret scrubbing</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 230" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Tier 1 -->
      <g transform="translate(20, 30)">
        <rect width="200" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#dc2626" stroke-width="2"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#dc2626">TIER 1: HARDLINE FLOOR</text>
        <text x="12" y="46" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Always-On Blacklist</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• No override possible</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• HERMES_WRITE_SAFE_ROOT</text>
        <text x="12" y="102" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Blocks rm -rf, raw dd</text>
        <rect x="12" y="125" width="176" height="22" rx="4" fill="#dc2626" fill-opacity="0.12"/>
        <text x="18" y="140" font-family="system-ui, sans-serif" font-size="9.5" font-weight="700" fill="#b91c1c">Zero bypass permitted</text>
      </g>

      <!-- Tier 2 -->
      <g transform="translate(245, 30)">
        <rect width="205" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#f59e0b" stroke-width="1.8"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#b45309">TIER 2: APPROVAL MODES</text>
        <text x="12" y="46" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Context-Aware Gate</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 3 modes: Ask, Auto, YOLO</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• YOLO switch shows in UI</text>
        <text x="12" y="102" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Approvals history logged</text>
        <rect x="12" y="125" width="181" height="22" rx="4" fill="#f59e0b" fill-opacity="0.12"/>
        <text x="18" y="140" font-family="system-ui, sans-serif" font-size="9.5" font-weight="600" fill="#b45309">Interactive operator check</text>
      </g>

      <!-- Tier 3 -->
      <g transform="translate(475, 30)">
        <rect width="205" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#2563eb">TIER 3: DOCKER SANDBOX</text>
        <text x="12" y="46" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Container Isolation</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="#047857">• --pids-limit 2048 (in code)</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Docs said 256 (hit limit!)</text>
        <text x="12" y="102" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Drop net &amp; linux caps</text>
        <rect x="12" y="125" width="181" height="22" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
        <text x="18" y="140" font-family="system-ui, sans-serif" font-size="9.5" font-weight="600" fill="#1d4ed8">Isolated command exec</text>
      </g>

      <!-- Tier 4 -->
      <g transform="translate(705, 30)">
        <rect width="195" height="160" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.8"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#047857">TIER 4: SECRETS SCRUB</text>
        <text x="12" y="46" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Secrets Sanitizer</text>
        <text x="12" y="66" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Scrubs child env vars</text>
        <text x="12" y="84" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Subagents receive no keys</text>
        <text x="12" y="102" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• SSRF &amp; egress checks</text>
        <rect x="12" y="125" width="171" height="22" rx="4" fill="#10b981" fill-opacity="0.12"/>
        <text x="18" y="140" font-family="system-ui, sans-serif" font-size="9.5" font-weight="600" fill="#047857">Credentials shielded</text>
      </g>
    </svg>
  </div>
</div>`;

    case '09':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 09 VISUAL GUIDE</div>
    <h4>Model Routing, Credential Pools &amp; Fallback Grid</h4>
    <p>The primary vs auxiliary model split and the critical clarification: OpenCode is a provider API</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 230" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Primary Model Lane -->
      <g transform="translate(30, 25)">
        <rect width="250" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">PRIMARY MODEL LANE</text>
        <text x="12" y="44" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Heavy Reasoning &amp; Code</text>
        <text x="12" y="62" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Claude 3.5, GPT-4o, Hermes 3</text>
        <text x="12" y="78" font-family="system-ui, sans-serif" font-size="10.5" fill="#059669">Multi-step planning &amp; tools</text>
      </g>

      <!-- Auxiliary Model Lane -->
      <g transform="translate(30, 125)">
        <rect width="250" height="90" rx="8" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.8"/>
        <text x="12" y="24" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">AUXILIARY MODEL LANE</text>
        <text x="12" y="44" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Cheap &amp; Fast Chores</text>
        <text x="12" y="62" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Compression, title generation,</text>
        <text x="12" y="78" font-family="system-ui, sans-serif" font-size="10.5" fill="#047857">Cron preflights, heartbeat</text>
      </g>

      <path d="M 280 70 L 330 115" stroke="#3b82f6" stroke-width="1.5" marker-end="url(#arr-b0)"/>
      <path d="M 280 170 L 330 125" stroke="#10b981" stroke-width="1.5" marker-end="url(#arr-green)"/>

      <!-- Center: Credential Pools & Fallback Grid -->
      <g transform="translate(340, 30)">
        <rect width="280" height="175" rx="10" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">CREDENTIAL POOLS &amp; FALLBACK</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Multi-Key Round Robin</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Many keys per provider</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Ranked provider fallback grid</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Auto-switch on rate limit (429)</text>
        <rect x="15" y="125" width="250" height="35" rx="6" fill="#8b5cf6" fill-opacity="0.1"/>
        <text x="22" y="142" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#6d28d9">Secret precedence: CLI arg → env →</text>
        <text x="22" y="154" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#6d28d9">keyring → profiles.yaml</text>
      </g>

      <path d="M 620 120 L 665 120" stroke="#8b5cf6" stroke-width="2" marker-end="url(#arr-loop)"/>

      <!-- Right: OpenCode Clarification -->
      <g transform="translate(675, 30)">
        <rect width="215" height="175" rx="10" fill="var(--surface-card, #ffffff)" stroke="#f59e0b" stroke-width="1.8"/>
        <text x="12" y="26" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#b45309">PREMISE CORRECTION</text>
        <text x="12" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="var(--text-primary, #0f172a)">"OpenCode" in Hermes</text>
        <text x="12" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="#dc2626">NOT a coding agent!</text>
        <text x="12" y="90" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 1,008 code references checked</text>
        <text x="12" y="108" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• It is an API PROVIDER name</text>
        <text x="12" y="126" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• No spawn or agent path exists</text>
        <rect x="10" y="140" width="195" height="22" rx="4" fill="#f59e0b" fill-opacity="0.15"/>
        <text x="16" y="155" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#b45309">Rule 13 Premise Fixed</text>
      </g>
    </svg>
  </div>
</div>`;

    case '10':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 10 VISUAL GUIDE</div>
    <h4>Plugin Contract, Middleware Hooks &amp; ACP Server Mode</h4>
    <p>17 plugin kinds governed by a shrinking-core policy, request middleware, and Agent Control Protocol</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 230" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- 17 Plugin Kinds -->
      <g transform="translate(30, 25)">
        <rect width="250" height="175" rx="10" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">17 PLUGIN KINDS (1 CONTRACT)</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Compatibility Contract</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Version handshake protocol</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Shrinking-core governance</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Tools, providers, channels,</text>
        <text x="15" y="122" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">  evaluators, memory providers...</text>
        <rect x="15" y="138" width="220" height="22" rx="4" fill="#3b82f6" fill-opacity="0.12"/>
        <text x="22" y="153" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#1d4ed8">Survives upstream upgrades</text>
      </g>

      <!-- Center: Middleware & PTC -->
      <g transform="translate(310, 25)">
        <rect width="280" height="175" rx="10" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">MIDDLEWARE &amp; PTC EXECUTION</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Programmatic Tool Calling</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 4 middleware hook kinds</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Pre/post request modification</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• execute_code (PTC) calls refund</text>
        <text x="15" y="122" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">  iteration budget!</text>
        <rect x="15" y="138" width="250" height="22" rx="4" fill="#10b981" fill-opacity="0.12"/>
        <text x="22" y="153" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#047857">3-Stage Environment Scrubbing</text>
      </g>

      <!-- Right: ACP Adapter -->
      <g transform="translate(620, 25)">
        <rect width="270" height="175" rx="10" fill="var(--surface-card, #ffffff)" stroke="#8b5cf6" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">HERMES AS SERVER: ACP</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Agent Control Protocol</text>
        <text x="15" y="68" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• 19 files / 5,846 LOC in acp_adapter</text>
        <text x="15" y="86" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Standardized RPC interface</text>
        <text x="15" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Exposes Hermes as headless agent</text>
        <rect x="15" y="138" width="240" height="22" rx="4" fill="#8b5cf6" fill-opacity="0.12"/>
        <text x="22" y="153" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#6d28d9">Potential Engine Transport (§4.4)</text>
      </g>
    </svg>
  </div>
</div>`;

    case '11':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 11 VISUAL GUIDE</div>
    <h4>The Egress Credential-Injection Proxy: iron-proxy</h4>
    <p>The single strongest security design in Hermes: API secrets are NEVER exposed to the agent container</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 240" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Agent in Sandbox -->
      <g transform="translate(30, 30)">
        <rect width="240" height="170" rx="10" fill="var(--surface-card, #ffffff)" stroke="#f59e0b" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#b45309">SANDBOXED AGENT CONTAINER</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Untrusted Code / Tools</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Agent runs shell / code</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Wants to call External API</text>
        <text x="15" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Has ONLY dummy token:</text>
        <rect x="15" y="125" width="210" height="28" rx="4" fill="#f59e0b" fill-opacity="0.15"/>
        <text x="25" y="143" font-family="monospace" font-size="11" font-weight="700" fill="#b45309">Bearer &lt;DUMMY_TOKEN&gt;</text>
      </g>

      <!-- Arrow from Agent to iron-proxy -->
      <path d="M 270 115 L 340 115" stroke="#f59e0b" stroke-width="2" marker-end="url(#arr-b0)"/>
      <text x="305" y="105" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#b45309">Dummy Req</text>

      <!-- iron-proxy -->
      <g transform="translate(350, 20)">
        <rect width="250" height="190" rx="10" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="2.2"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#047857">iron-proxy (EGRESS GUARD)</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">Secure Token Interceptor</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">1. Intercepts outbound request</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">2. Matches target domain to whitelist</text>
        <text x="15" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">3. Swaps DUMMY with REAL SECRET</text>
        <rect x="15" y="125" width="220" height="42" rx="4" fill="#10b981" fill-opacity="0.15"/>
        <text x="22" y="142" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#047857">REAL SECRET HELD ONLY HERE</text>
        <text x="22" y="156" font-family="system-ui, sans-serif" font-size="9.5" fill="#047857">Agent never sees API key</text>
      </g>

      <!-- Arrow from iron-proxy to External Web -->
      <path d="M 600 115 L 670 115" stroke="#10b981" stroke-width="2" marker-end="url(#arr-green)"/>
      <text x="635" y="105" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#047857">Authenticated</text>

      <!-- External API -->
      <g transform="translate(680, 30)">
        <rect width="210" height="170" rx="10" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="1.8"/>
        <text x="15" y="26" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">EXTERNAL TARGET APIS</text>
        <text x="15" y="48" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="var(--text-primary, #0f172a)">GitHub, Stripe, AWS, Slack...</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Receives valid token</text>
        <text x="15" y="88" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Executes permitted action</text>
        <text x="15" y="106" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">• Returns response cleanly</text>
        <rect x="15" y="125" width="180" height="28" rx="4" fill="#10b981" fill-opacity="0.15"/>
        <text x="22" y="143" font-family="system-ui, sans-serif" font-size="10" font-weight="700" fill="#047857">NO EXFILTRATION RISK ✓</text>
      </g>
    </svg>
  </div>
</div>`;

    case '12':
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 12 SYNTHESIS BLUEPRINT</div>
    <h4>The Strategic Transfer Matrix &amp; Architectural Recommendation</h4>
    <p>Answering the 3 owner questions: What goes where, and why we BUILD AROUND</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 270" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <!-- Left Column: What Moves INTO Hermes -->
      <g transform="translate(20, 20)">
        <rect width="270" height="230" rx="10" fill="var(--surface-card, #ffffff)" stroke="#3b82f6" stroke-width="2"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">Q1: OUR STRENGTHS → INTO HERMES</text>
        <text x="15" y="52" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">1. Real Multi-Tenancy Key</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Hermes profiles do not isolate customers.</text>
        <text x="15" y="95" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">2. Typed Engine Port (Row 28)</text>
        <text x="15" y="113" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">8 typed ops keep engines replaceable.</text>
        <text x="15" y="138" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">3. Definition-of-Done Contracts</text>
        <text x="15" y="156" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Proof deliverables to clients, not feelings.</text>
        <text x="15" y="181" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">4. Scoreboard Discipline</text>
        <text x="15" y="199" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Structured engineering verification ledger.</text>
      </g>

      <!-- Center: What Moves INTO Our Platform -->
      <g transform="translate(310, 20)">
        <rect width="280" height="230" rx="10" fill="var(--surface-card, #ffffff)" stroke="#10b981" stroke-width="2"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">Q2: HERMES STRENGTHS → INTO PLATFORM</text>
        <text x="15" y="52" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#047857">1. iron-proxy Egress Proxy (★ #1)</text>
        <text x="15" y="70" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Credential injection shields secrets forever.</text>
        <text x="15" y="95" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">2. Plugin Compatibility Contract</text>
        <text x="15" y="113" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Shrinking-core governance protects extensions.</text>
        <text x="15" y="138" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">3. Auxiliary Task-Class Lane</text>
        <text x="15" y="156" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Route cheap background chores off primary.</text>
        <text x="15" y="181" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">4. Secret Precedence Ladder</text>
        <text x="15" y="199" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Strict precedence + 3-stage environment scrub.</text>
      </g>

      <!-- Right Column: Question 3 Decision -->
      <g transform="translate(610, 20)">
        <rect width="290" height="230" rx="10" fill="#3b82f6" fill-opacity="0.08" stroke="#3b82f6" stroke-width="2.2"/>
        <text x="15" y="28" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">Q3: BUILD ON, AROUND, OR UNDER?</text>
        
        <rect x="15" y="45" width="260" height="35" rx="6" fill="#dc2626" fill-opacity="0.1"/>
        <text x="25" y="66" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#dc2626">Build ON? REJECTED (High cost)</text>

        <rect x="15" y="90" width="260" height="48" rx="6" fill="#10b981" fill-opacity="0.18" stroke="#10b981" stroke-width="1.5"/>
        <text x="25" y="110" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#047857">Build AROUND? RECOMMENDED ✓</text>
        <text x="25" y="126" font-family="system-ui, sans-serif" font-size="10" fill="#047857">Hermes as Engine Adapter behind Row 28</text>

        <rect x="15" y="148" width="260" height="35" rx="6" fill="#f59e0b" fill-opacity="0.1"/>
        <text x="25" y="169" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#b45309">Build UNDER? Partial candidate</text>

        <text x="15" y="205" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="var(--text-primary, #0f172a)">Verdict: Protect platform multi-tenancy &amp; port;</text>
        <text x="15" y="220" font-family="system-ui, sans-serif" font-size="10.5" font-weight="600" fill="var(--text-primary, #0f172a)">plug Hermes in cleanly behind the door.</text>
      </g>
    </svg>
  </div>
</div>`;

    default:
      return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH ${batchNum} VISUAL GUIDE</div>
    <h4>${docTitle || 'Forensic Analysis & Verification Map'}</h4>
    <p>Forensic examination, measured claims, and verified code findings</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 920 170" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-gen" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#3b82f6"/>
        </marker>
        <marker id="arr-gen-g" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981"/>
        </marker>
      </defs>
      <rect x="20" y="15" width="880" height="140" rx="10" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #cbd5e1)" stroke-width="1.5"/>
      <g transform="translate(45, 35)">
        <rect width="230" height="95" rx="6" fill="#3b82f6" fill-opacity="0.1" stroke="#3b82f6" stroke-width="1.5"/>
        <text x="15" y="30" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#2563eb">1. DOCUMENTATION CLAIM</text>
        <text x="15" y="55" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Target subsystem guide</text>
        <text x="15" y="75" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#2563eb">Hypothesis Recorded</text>
      </g>
      <path d="M 290 82 L 340 82" stroke="#3b82f6" stroke-width="2" marker-end="url(#arr-gen)"/>
      <g transform="translate(350, 35)">
        <rect width="240" height="95" rx="6" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="1.5"/>
        <text x="15" y="30" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#047857">2. SOURCE CODE VERIFIED</text>
        <text x="15" y="55" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Measured in Python AST</text>
        <text x="15" y="75" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#047857">Code Wins Disagreements</text>
      </g>
      <path d="M 605 82 L 655 82" stroke="#10b981" stroke-width="2" marker-end="url(#arr-gen-g)"/>
      <g transform="translate(665, 35)">
        <rect width="210" height="95" rx="6" fill="#8b5cf6" fill-opacity="0.1" stroke="#8b5cf6" stroke-width="1.5"/>
        <text x="15" y="30" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#6d28d9">3. VERIFIED FINDING</text>
        <text x="15" y="55" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">Added to study ledger</text>
        <text x="15" y="75" font-family="system-ui, sans-serif" font-size="11" font-weight="600" fill="#6d28d9">100% Unabridged Text ✓</text>
      </g>
    </svg>
  </div>
</div>`;
  }
}

const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'all', title: 'Executive Topology: Nous Hermes vs Platform', category: 'Strategic Architecture', description: 'Comparison of Multi-Tenancy Key & Row 28 Typed Engine Port enclosing the Hermes engine adapter.' },
  { id: '00', batchNum: '00', title: 'Batch 00: Forensic Pin & Codebase Anatomy', category: 'Foundations', description: 'Distribution of 698k Python lines across subsystems and the 5-step forensic verification methodology.' },
  { id: '01', batchNum: '01', title: 'Batch 01: Agent Loop Execution Flow', category: 'Execution Engine', description: 'The complete think-act-observe cycle, alternation repair pass, daemon thread pool concurrency, and iteration budget refund.' },
  { id: '02', batchNum: '02', title: 'Batch 02: Profile Boundary & Bot Routing', category: 'Execution Engine', description: 'Profiles provide directory separation, NOT security sandboxes; Bot mode attribution and shared-state rooms.' },
  { id: '03', batchNum: '03', title: 'Batch 03: 3-Way Self-Improving Learning Loop', category: 'Intelligence & Memory', description: 'Live experience extraction via /learn, human write-approval safety gate, and background curator pruning.' },
  { id: '04', batchNum: '04', title: 'Batch 04: 4-Tier Memory & Dynamic Tail Sizing', category: 'Intelligence & Memory', description: 'Working context token budget, dynamic tail sizing, context compressor, 2KB persistent memory limit, and /journey timeline.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Tool Registry, MCP Door & Tool Search', category: 'Tools & Gateway', description: 'Agent Core routing between built-in Python tools, MCP servers via JSON-RPC, and the Nous hosted gateway.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Delegation Tree & /goal Quality Gate', category: 'Orchestration', description: 'Parent-to-child delegation caps (corrected child cap 250) and the 5-field completion contract with LLM judge.' },
  { id: '07', batchNum: '07', title: 'Batch 07: 24-Platform Session Pipeline & Dashboard', category: 'Orchestration', description: 'Unified session model across 24 messaging platforms, durable SQLite storage, and the 99-section / 816-key dashboard surface.' },
  { id: '08', batchNum: '08', title: 'Batch 08: 4-Tier Security Defense Matrix', category: 'Security & Governance', description: 'Hardline Floor non-overridable blacklist, context-aware approvals, Docker container with corrected 2048 pids limit, and secret sanitization.' },
  { id: '09', batchNum: '09', title: 'Batch 09: Model Routing & Provider Grid', category: 'Execution Engine', description: 'Primary reasoning vs auxiliary chore lane split, multi-key credential pools, fallback grid, and OpenCode provider clarification.' },
  { id: '10', batchNum: '10', title: 'Batch 10: Plugin Contract, Middleware & ACP Server', category: 'Extensibility', description: '17 plugin kinds, version compatibility contract, pre/post middleware hooks, and ACP server adapter.' },
  { id: '11', batchNum: '11', title: 'Batch 11: Omni-Channel Gateway & iron-proxy Egress', category: 'Channels & Security', description: '35 messaging platforms gateway and the credential-injection proxy (iron-proxy) shielding API secrets.' },
  { id: '12', batchNum: '12', title: 'Batch 12: Strategic Synthesis & Build AROUND Blueprint', category: 'Strategic Decision', description: 'The transfer matrix answering what goes where and the recommended Build AROUND architecture.' }
];

function getAllDiagrams() {
  const map = {
    'master': { id: 'master', html: getMasterDiagram() }
  };
  ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].forEach(num => {
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
