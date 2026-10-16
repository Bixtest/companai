// High-precision SVG diagrams for each batch of the Zulip Platform Study.
// Adaptive colours use the reader's CSS custom properties so the diagrams follow
// the active theme (Light / Dark / Sepia / Night) without any JS.
//
// Every diagram is a self-contained string wrapped in the shared markup:
//   <div class="diagram-wrapper"> <div class="diagram-header"> ... <div class="diagram-svg-container"> <svg ...>
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
// MASTER - Executive topology: three process families, the strongest P2 in the
// study, the first real widget model, and the densest guard culture.
// ---------------------------------------------------------------------------
function getMasterDiagram() {
  return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">EXECUTIVE ARCHITECTURE MAP</div>
    <h4>Zulip Platform Study Topology: one repository, three entry points, and a tenancy fence that is the request itself</h4>
    <p>Where each studied mechanism lands, and what the nine platforms before it did not have</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 590" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('master')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">Zulip 12.0-dev+git - DJANGO + TORNADO + RABBITMQ</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">One manage.py, three entry points - 425,702 LOC Python / 153,253 TS - 789 migrations - Apache-2.0</text>

      <text x="40" y="80" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE PROCESS FAMILIES (the first multi-process server by construction in the study)</text>
      ${card(40, 92, 280, 96, 'DJANGO (WSGI)', [
        'HTTP API + web app + business logic',
        'zerver/ - 1,186 files',
        'ROOT_URLCONF swapped only under runtornado'
      ])}
      ${card(340, 92, 280, 96, 'TORNADO', [
        'manage.py runtornado',
        'the event queues - long-poll client sync',
        'zerver/tornado/ - 10 files'
      ])}
      ${card(640, 92, 280, 96, 'QUEUE WORKERS', [
        'manage.py process_queue --queue=X',
        'email - push - thumbnails - analytics',
        'zerver/worker/ - 19 files'
      ])}

      <text x="40" y="222" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE THREE POLES</text>
      ${card(40, 234, 280, 148, 'P1 - THE AISSISTANT', [
        'ONE LLM feature: topic summarisation',
        'A bot IS a UserProfile - no agent object',
        'No tools - no memory - no streaming',
        { text: 'DELIBERATELY TINY', color: '#7c3aed' },
        { text: 'fenced five ways (F1-F5)', color: '#059669' }
      ])}
      ${card(340, 234, 280, 148, 'P2 - THE WORKSPACE', [
        'A 95-field Realm config object',
        'Email is unique ONLY per-realm',
        '5 roles - 8 system groups - 38 can_*',
        { text: 'THE STRONGEST P2 IN THE STUDY', color: '#059669' },
        { text: 'the ambient realm: Host to subdomain', color: '#059669' }
      ])}
      ${card(640, 234, 280, 148, 'P3 - AUTOMATIONS', [
        '14 queues - one worker framework',
        'delivery_mode=2 (at-least-once)',
        'A disk dead-letter',
        { text: 'THE CLAIM QUEUE (M1-M5)', color: '#7c3aed' },
        { text: 'exactly-one-worker per message', color: '#059669' }
      ])}

      <rect x="40" y="400" width="440" height="74" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.4"/>
      <text x="260" y="424" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#059669">THE STUDY'S FIRST REAL WIDGET MODEL (PX-W)</text>
      <text x="260" y="443" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">A widget is an APPEND-ONLY SubMessage log - state is DERIVED BY REPLAY</text>
      <text x="260" y="460" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">Late joiners correct by construction - no new transport</text>

      <rect x="500" y="400" width="420" height="74" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.4"/>
      <text x="710" y="424" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#7c3aed">THE DENSEST GUARD CULTURE (PZ)</text>
      <text x="710" y="443" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">check-schemas: ONE truth across THREE representations, diffed across languages</text>
      <text x="710" y="460" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">API_FEATURE_LEVEL=513 ratchet - mark_sanitized - AGENTS.md</text>

      <rect x="40" y="492" width="880" height="60" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
      <text x="480" y="516" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="var(--text-primary, #0f172a)">THE ONE STRUCTURAL ANSWER</text>
      <text x="480" y="538" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">"Make the wrong thing hard to do, then catch the rest automatically." - and it is honest about where discipline replaces enforcement (no RLS)</text>
    </svg>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// CARD HELPER - one shared box renderer for every diagram
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
    case '00': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 00 - THE PIN</div>
    <h4>The pin, the extraction, and the two counting traps</h4>
    <p>99.92% of the tree, one lost fixture class, and why a numbering ceiling is not a count</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 430" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b00')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">Zulip 12.0-dev+git - PINNED BEFORE ANY READING</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Zip md5 f9cea131769925ceb01e64ea78c4113e - Apache-2.0 - extracted to platforms/_extracted/zulip-main</text>

      ${card(40, 76, 280, 132, 'THE EXTRACT', [
        '9,009 / 9,016 files = 99.92%',
        '7 Mattermost-import fixtures lost',
        'to the Windows 260-char MAX_PATH',
        { text: 'extraction re-run TOLERATING failures', color: '#b45309' }
      ])}
      ${card(340, 76, 280, 132, 'TRAP 1 - THE CEILING', [
        'Migrations numbered 0001-0812',
        'But that is the CEILING, not the count',
        { text: 'truth: 789 numbered files', color: '#059669' },
        '27 numbers absent (0002-0028, squashed)'
      ])}
      ${card(640, 76, 280, 132, 'TRAP 2 - THE BATCH', [
        'find | xargs wc -l | tail -1',
        'gave 13,952 Python LOC',
        { text: 'a 30x UNDERCOUNT', color: '#ef4444' },
        'honest per-file walk: 425,702'
      ])}

      <text x="40" y="242" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE DUPLICATE NUMBERS - a maintenance script's constant set read as a fossil record</text>
      ${card(40, 256, 440, 150, 'FOUR NUMBERS CARRY TWO MIGRATIONS EACH', [
        '0001 - 0001_initial + 0001_squashed_0569',
        '0209 - stream_first_message_id + user_profile_no_empty_password',
        '0261, 0501 - two more collision pairs',
        { text: 'exactly the MIGRATIONS_TO_SKIP set', color: '#7c3aed' },
        { text: 'the skip list indexes the mistakes it absorbs', color: '#059669' }
      ])}
      ${card(500, 256, 420, 150, 'WHAT THE PIN DECLARED', [
        'Docs are claims; code is the authority',
        'Every claim carries file:line',
        'Rule 13: a committed number can be wrong',
        { text: 're-measure, then commit the fix BY NAME', color: '#059669' },
        'The batches stayed comparison-free'
      ])}
    </svg>
  </div>
</div>`;

    case '01': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 01 - THE PLATFORM</div>
    <h4>Three process families, one database, four stores</h4>
    <p>The first multi-process server in the study, and the tenancy statement hiding in a silenced linter check</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 470" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b01')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">ONE REPOSITORY - THREE ENTRY POINTS - ONE manage.py</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">INSTALLED_APPS is deliberately short: 14 apps - zilencer and corporate are the opt-in split</text>

      <rect x="120" y="72" width="720" height="56" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.4"/>
      <text x="480" y="95" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#7c3aed">ONE CODEBASE, THREE BOOT MODES</text>
      <text x="480" y="116" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">ROOT_URLCONF is swapped to zproject.tornado_urls ONLY when the same code boots as runtornado</text>

      <line x1="240" y1="128" x2="160" y2="152" stroke="var(--diagram-accent, #7c3aed)" stroke-width="1.6" marker-end="url(#arr-b01)"/>
      <line x1="480" y1="128" x2="480" y2="152" stroke="var(--diagram-accent, #7c3aed)" stroke-width="1.6" marker-end="url(#arr-b01)"/>
      <line x1="720" y1="128" x2="800" y2="152" stroke="var(--diagram-accent, #7c3aed)" stroke-width="1.6" marker-end="url(#arr-b01)"/>

      ${card(40, 152, 280, 120, 'DJANGO (WSGI)', [
        'runserver / uWSGI',
        'HTTP API + web app + business logic',
        'zerver/ - 1,186 files',
        'The default boot'
      ], { title: 'DJANGO (WSGI)' })}
      ${card(340, 152, 280, 120, 'TORNADO', [
        'manage.py runtornado',
        'THE EVENT QUEUES',
        'long-poll client sync',
        'zerver/tornado/ - 10 files'
      ])}
      ${card(640, 152, 280, 120, 'QUEUE WORKERS', [
        'process_queue --queue=X',
        '17 @assign_queue processors',
        'email - push - analytics',
        'zerver/worker/ - 19 files'
      ])}

      <text x="40" y="306" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE FOUR STORES, NAMED</text>
      ${card(40, 318, 220, 118, 'POSTGRESQL', [
        'All relational state',
        '789 numbered migrations',
        'LINEAR, not branched per app',
        'the project refuses to edit an applied migration'
      ])}
      ${card(275, 318, 220, 118, 'RABBITMQ', [
        'The internal queues',
        'zerver/lib/queue.py',
        'A worker per queue',
        '14 queue processors'
      ])}
      ${card(510, 318, 220, 118, 'REDIS / MEMCACHED', [
        'The caching layer',
        'MEMCACHED_LOCATION',
        'docs/subsystems/caching.md',
        'Not a source of truth'
      ])}
      ${card(745, 318, 175, 118, 'FS / S3', [
        'Uploads - thumbnails',
        'zerver/lib/thumbnail.py',
        'LOCAL_UPLOADS_DIR',
        'exports'
      ])}

      <rect x="40" y="452" width="880" height="0" rx="8" fill="none" stroke="none"/>
    </svg>
  </div>
</div>`;

    case '02': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 02 - POLE 1</div>
    <h4>The aissistant: one LLM feature, five fences</h4>
    <p>Where n8n built the agent, Zulip admitted the model and fenced it with primitives that already existed</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 500" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b02')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">P1 IS DELIBERATELY TINY - ONE FEATURE, FIVE FENCES</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Topic summarisation. No tools, no memory, no streaming, no RAG - and no agent framework was added.</text>

      <text x="40" y="84" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE FIVE FENCES - each one an existing product primitive</text>
      ${card(40, 96, 290, 104, 'F1 - SERVER OPT-IN', [
        'TOPIC_SUMMARIZATION_MODEL defaults to None',
        'AI features DO NOT EXIST',
        'unless the operator configures them',
        { text: 'default_settings.py:769', color: '#7c3aed' }
      ])}
      ${card(345, 96, 290, 104, 'F2 - PER-REALM PERMISSION', [
        'can_summarize_topics_group',
        'a GroupPermissionSetting',
        'defaults to EVERYONE, settable to nobody',
        { text: 'realms.py:914', color: '#7c3aed' }
      ])}
      ${card(650, 96, 270, 104, 'F3 - PER-USER COST CAP', [
        'MAX_PER_USER_MONTHLY_AI_COST',
        'default 0.5 USD',
        'enforced in the view',
        { text: 'message_summary.py:28-33', color: '#7c3aed' }
      ])}
      ${card(40, 214, 290, 104, 'F4 - PROVIDER-NEUTRAL', [
        'API_BASE + API_KEY from a SECRET',
        'not hardcoded',
        'dev uses Groq; prod template shows HF',
        { text: 'computed_settings.py:1329-1330', color: '#7c3aed' }
      ])}
      ${card(345, 214, 290, 104, 'F5 - UNTRUSTED OUTPUT', [
        'markdown_convert(summary,',
        '  message_realm=user_profile.realm)',
        'model output goes through the SAME',
        'sanitizer as a user message',
        { text: 'the model never produces safe HTML', color: '#059669' }
      ])}
      ${card(650, 214, 270, 104, 'THE BOT PRIMITIVE', [
        'A bot IS a UserProfile',
        'mentioned - DMd - subscribed -',
        'permission-checked by the SAME code',
        { text: 'NO new "agent" object', color: '#059669' }
      ])}

      <text x="40" y="352" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE HONEST LEDGER - named, unfixed, in the code's own words</text>
      ${card(40, 364, 440, 108, 'KNOWN GAPS (BATCH 02)', [
        { text: 'The AI cost-cap race: checked pre-call,', color: '#ef4444' },
        { text: '  incremented post-call. TODO describes', color: '#ef4444' },
        { text: '  the fix (a locked reservation) - NOT done', color: '#ef4444' },
        'Summary caching deliberately absent',
        'react and update_message: declared, empty'
      ])}
      ${card(500, 364, 420, 108, 'THE MEASURE OF THE DESIGN', [
        'The bot API is a 7-operation facade',
        'The old bot path is still the generic one',
        'Capability lives in the PROVIDER, not',
        'in a new agent framework',
        { text: 'admit the model - do not build an agent', color: '#059669' }
      ])}
    </svg>
  </div>
</div>`;

    case '03': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 03 - POLE 2</div>
    <h4>The workspace: the ambient realm</h4>
    <p>The tenant is derived from the request's Host header, and the fence is one comparison</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 560" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b03')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">THE STRONGEST P2 IN THE STUDY</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">zerver/lib/subdomains.py is 96 lines - the entire tenancy module</text>

      <rect x="40" y="70" width="880" height="96" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.6"/>
      <text x="60" y="92" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#7c3aed">THE REQUEST ARRIVES</text>
      <text x="60" y="112" font-family="monospace, monospace" font-size="11" fill="var(--text-primary, #0f172a)">GET https://acme.example.com/api/v1/messages</text>
      <text x="60" y="132" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">host = request.get_host().lower()  -  subdomain = get_subdomain_from_hostname(host)  -  EXTERNAL_HOST drives everything</text>
      <text x="60" y="152" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">REALM_HOSTS gives a realm a COMPLETELY DIFFERENT hostname (chat.theircompany.com) - ROOT_SUBDOMAIN_ALIASES maps www back to root</text>

      <line x1="480" y1="166" x2="480" y2="188" stroke="var(--diagram-accent, #7c3aed)" stroke-width="1.8" marker-end="url(#arr-b03)"/>

      <rect x="220" y="190" width="520" height="56" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
      <text x="480" y="213" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#059669">THE FENCE - ONE COMPARISON</text>
      <text x="480" y="234" text-anchor="middle" font-family="monospace, monospace" font-size="11" fill="var(--text-primary, #0f172a)">user_profile.realm.subdomain == realm_subdomain</text>

      <text x="40" y="284" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">WHY THIS IS THE FINDING</text>
      ${card(40, 296, 280, 118, 'STRUCTURALLY OPPOSITE', [
        'A tenant is NOT an argument',
        'a developer might forget to pass',
        'It is resolved ONCE, from the request',
        { text: 'unwritable, not merely testable', color: '#059669' }
      ])}
      ${card(340, 296, 280, 118, 'IDENTITY-EMBEDDED', [
        'Email is unique ONLY per-realm',
        'a@b.com can exist in two realms',
        'revealed by a SILENCED auth.W004',
        { text: 'the realm is part of who you are', color: '#059669' }
      ])}
      ${card(640, 296, 280, 118, 'THE HONEST LIMIT', [
        { text: 'NO database-level enforcement', color: '#ef4444' },
        'no row-level security',
        'the fence is a middleware comparison',
        { text: 'discipline, not enforcement', color: '#b45309' }
      ])}

      <text x="40" y="448" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE AUDIT LOG - 117 EVENT TYPES, A NAMESPACE THAT ENCODES THE TOPOLOGY</text>
      ${card(40, 460, 200, 84, '1xx - 2xx', [
        'realm events',
        'the ambient tier'
      ])}
      ${card(255, 460, 200, 84, '9xx', [
        'folder events',
        'streams and topics'
      ])}
      ${card(470, 460, 240, 84, '10xxx = REALM + 10000', [
        'REMOTE SERVER events',
        'the namespace documents',
        'its own federation topology'
      ])}
      ${card(725, 460, 195, 84, '20xxx', [
        'remote realm events',
        'the same trick, one tier out'
      ])}
    </svg>
  </div>
</div>`;

    case '04': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 04 - POLE 3</div>
    <h4>Automations: the claim queue and the 10-minute cutoff</h4>
    <p>Exactly-one-worker-per-message from an at-least-once base - and a deliberate preference for a missing reminder over a flood</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 540" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b04')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">try_deliver_one_scheduled_message() - THE HEART OF P3</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">zerver/actions/scheduled_messages.py:431-465 - the same pattern as Multica's FOR UPDATE SKIP LOCKED, applied to a USER-VISIBLE deadline</text>

      <text x="40" y="84" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE FIVE MECHANISMS (M1-M5)</text>
      ${card(40, 96, 290, 100, 'M1 - THE THREE-FIELD CLAIM', [
        'scheduled_timestamp__lte=now()',
        'delivered=False',
        'failed=False',
        { text: 'due - not-done - not-failed', color: '#059669' }
      ])}
      ${card(345, 96, 290, 100, 'M2 - THE ROW LOCK', [
        '.select_for_update(no_key=True)',
        'Two cron workers cannot',
        'grab the same message',
        { text: 'scheduled_messages.py:440', color: '#7c3aed' }
      ])}
      ${card(650, 96, 270, 100, 'M3 - ONE TRANSACTION', [
        '@transaction.atomic(durable=True)',
        'claim + send + flag flip',
        'are a single atomic unit',
        { text: 'scheduled_messages.py:431', color: '#7c3aed' }
      ])}
      ${card(40, 210, 290, 100, 'M4 - TERMINAL STATE', [
        'failed=True + failure_message',
        'A failed reminder is NOT',
        'silently retried forever',
        { text: 'scheduled_messages.py:455+', color: '#7c3aed' }
      ])}
      ${card(345, 210, 290, 100, 'M5 - THE 10-MINUTE CUTOFF', [
        'SCHEDULED_MESSAGE_LATE_CUTOFF_MINUTES=10',
        'After an outage, send what is',
        'still in the window - let the rest go',
        { text: 'scheduled_messages.py:43', color: '#7c3aed' }
      ])}
      ${card(650, 210, 270, 100, 'THE STATE MACHINE', [
        '(False, False) - claimable',
        '(True, _) - done',
        '(False, True) - dead',
        { text: 'THERE IS NO RETRY STATE', color: '#ef4444' }
      ])}

      <rect x="40" y="330" width="880" height="72" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.6"/>
      <text x="480" y="354" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#059669">WHAT M1 + M2 + M3 TOGETHER ARE</text>
      <text x="480" y="375" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="var(--text-secondary, #475569)">A database-backed claim queue with exactly-one-worker-per-message, from an at-least-once base</text>
      <text x="480" y="394" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">The 10-minute cutoff is the clearest latency-limit primitive in the study: prefer a MISSING reminder to a FLOOD of stale ones</text>

      <text x="40" y="436" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE QUEUE SURFACE - 14 QUEUES, ONE FRAMEWORK, AND ITS HONEST NAME</text>
      ${card(40, 448, 440, 78, 'THE PLUMBING', [
        'delivery_mode=2 (at-least-once) - a disk dead-letter',
        'failed_tries rides INSIDE the event payload',
        'so retries survive a worker crash - MAX_REQUEST_RETRIES=3'
      ])}
      ${card(500, 448, 420, 78, 'THE HONEST NAME', [
        { text: 'queue_json_publish_rollback_unsafe', color: '#ef4444' },
        'republishes OUTSIDE the DB transaction',
        'the function name IS the document'
      ])}
    </svg>
  </div>
</div>`;

    case '05': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 05 - PX-W / PX-F</div>
    <h4>Widgets: an event log, not a config object</h4>
    <p>The study's first real widget model - and a frontend that is deliberately old-school</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b05')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">A WIDGET IS AN APPEND-ONLY SubMessage LOG</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">zerver/models/messages.py:331-346 - each interaction is a NEW row; the current state is the REPLAY of all submessages</text>

      <rect x="40" y="70" width="880" height="60" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.4"/>
      <text x="60" y="92" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#7c3aed">THE DOC SAYS IT PLAINLY</text>
      <text x="60" y="114" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">"The server's only real role is to decide who gets delivered which submessages. It's a lot like a 'subchat' system."</text>

      <text x="40" y="166" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">WHAT THE REPLAY MODEL BUYS</text>
      ${card(40, 178, 290, 96, 'STATE IS DERIVED', [
        'No poll_state column',
        'The votes ARE the rows',
        { text: 'state is a function of the log', color: '#059669' }
      ])}
      ${card(345, 178, 290, 96, 'MULTI-USER IS NATIVE', [
        'Every participant appends',
        'The server broadcasts via the',
        'EXISTING message-event system',
        { text: 'no second transport', color: '#059669' }
      ])}
      ${card(650, 178, 270, 96, 'LATE JOINERS CORRECT', [
        'A client opening an old message',
        'REPLAYS all submessages first',
        { text: 'widgetize.ts:62-72', color: '#7c3aed' }
      ])}

      <text x="40" y="310" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE CONTRACT AND THE BRIDGE</text>
      ${card(40, 322, 290, 100, 'THE CONTRACT', [
        'A zod discriminated union',
        'validated on BOTH sides',
        { text: 'drift is caught at the boundary', color: '#059669' }
      ])}
      ${card(345, 322, 290, 100, 'THE REGISTRY', [
        'GenericWidget registry',
        '+ a capability check',
        'an acknowledged TRANSITIONAL wrapper',
        { text: '"as of January 2026"', color: '#b45309' }
      ])}
      ${card(650, 322, 270, 100, 'THE BRIDGE - zform', [
        'How a third party gets a button UI',
        'without touching Zulip',
        { text: 'flows BOTH ways', color: '#059669' }
      ])}

      <rect x="40" y="442" width="440" height="62" rx="8" fill="var(--surface-card, #ffffff)" stroke="#b45309" stroke-width="1.4"/>
      <text x="260" y="464" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#b45309">THE SCAR - tictactoe</text>
      <text x="260" y="484" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">A DELETED legacy widget, still special-cased to suppress warnings</text>
      <text x="260" y="500" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">No plugin model, no composer, no versioning - BY DECISION</text>

      <rect x="500" y="442" width="420" height="62" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
      <text x="710" y="464" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">PX-F - DELIBERATELY OLD-SCHOOL</text>
      <text x="710" y="484" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">jQuery - 393 top-level TS modules - 462 hbs templates - 8 bundles</text>
      <text x="710" y="500" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">No framework, no design system, no enforcement plugin. Readable, unreusable.</text>
    </svg>
  </div>
</div>`;

    case '06': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 06 - PZ</div>
    <h4>Out-of-pole: the densest guard culture in the study</h4>
    <p>Nine check scripts, one truth across three representations, and a ratchet with a social consequence</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b06')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">9 check-* SCRIPTS - 65 EXECUTABLE TOOLS - EACH WITH ONE JOB</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">Zulip's engineering quality is not a feature but a METHOD - a set of guardrails that happened to ship a chat app</text>

      <text x="40" y="84" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">check-schemas - ONE TRUTH, THREE REPRESENTATIONS, DIFFED ACROSS LANGUAGE BOUNDARIES</text>
      ${card(40, 96, 290, 100, 'REPRESENTATION 1', [
        'The OpenAPI YAML',
        'hand-written',
        '31,869 lines - 119 REST paths',
        { text: 'not generated', color: '#059669' }
      ])}
      ${card(345, 96, 290, 100, 'REPRESENTATION 2', [
        'The Python test schemas',
        'zerver/tests',
        '150 files / 163,703 LOC',
        { text: 'the largest test mass in the study', color: '#059669' }
      ])}
      ${card(650, 96, 270, 100, 'REPRESENTATION 3', [
        'The JS fixtures',
        'web/ test fixtures',
        '21 web e2e files',
        { text: 'a third language, same contract', color: '#059669' }
      ])}

      <rect x="40" y="216" width="880" height="66" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
      <text x="480" y="240" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#059669">THE ONLY CROSS-LANGUAGE CONTRACT GUARD IN THE STUDY</text>
      <text x="480" y="262" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">A guard diffs them. Nothing else in nine platforms does this - and it is what makes API_FEATURE_LEVEL a real number.</text>
      <text x="480" y="278" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">It is what makes the widget contract a zod union rather than a hope.</text>

      <text x="40" y="318" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE RATCHET, THE ESCAPE HATCH, AND THE MACHINE-READABLE DISCIPLINE</text>
      ${card(40, 330, 290, 108, 'THE FEATURE-LEVEL RATCHET', [
        'API_FEATURE_LEVEL = 513',
        'Leave a ZF- marker and the build',
        'fails AND the announcement is skipped',
        { text: 'so a HUMAN must do it by hand', color: '#7c3aed' },
        { text: 'mechanical check + social obligation', color: '#059669' }
      ])}
      ${card(345, 330, 290, 108, 'mark_sanitized', [
        'A one-line IDENTITY function',
        'the named, justified escape hatch',
        'for the project own taint analyser',
        '7 call sites, each with a justification',
        { text: 'a NEGATIVE capability - elegant', color: '#059669' }
      ])}
      ${card(650, 330, 270, 108, 'AGENTS.md', [
        'Contributor discipline rewritten',
        'for an AI agent',
        '+ path-scoped .claude/rules',
        { text: 'the platform teaching its own', color: '#7c3aed' },
        { text: 'guardrails to a machine', color: '#7c3aed' }
      ])}

      <rect x="40" y="458" width="880" height="46" rx="8" fill="var(--surface-card, #ffffff)" stroke="#b45309" stroke-width="1.4"/>
      <text x="480" y="478" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#b45309">THE DEP-5 LICENCE LEDGER, GUARDED BY A SCRIPT</text>
      <text x="480" y="496" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">"This script is not a lawyer." - the single most quotable line in the tree: a guard that states its own limits</text>
    </svg>
  </div>
</div>`;

    case '07': return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH 07 - THE SYNTHESIS</div>
    <h4>The synthesis: three tiers, one answer, an honest ledger</h4>
    <p>What we take, what we adapt, and what Zulip says about its own limits</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 560" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b07')}
      <text x="40" y="34" font-family="system-ui, sans-serif" font-size="15" font-weight="700" fill="var(--diagram-accent, #7c3aed)">12 RANKED MECHANISMS - THREE TIERS</text>
      <text x="40" y="54" font-family="system-ui, sans-serif" font-size="11.5" fill="var(--text-secondary, #475569)">7 batches - 1,693 lines - 30 divergences - 8 star-headed sections elevated to 12 mechanisms</text>

      <rect x="40" y="70" width="880" height="66" rx="8" fill="var(--surface-card, #ffffff)" stroke="#059669" stroke-width="1.8"/>
      <text x="60" y="92" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#059669">TIER 1 - TRANSFERABLE NOW, NO ADAPTATION</text>
      <text x="60" y="114" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">1. The ambient realm - 2. The three-representation contract check - 3. The feature-level ratchet - 4. The five-fence LLM pattern</text>

      <rect x="40" y="150" width="880" height="66" rx="8" fill="var(--surface-card, #ffffff)" stroke="#7c3aed" stroke-width="1.8"/>
      <text x="60" y="172" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="#7c3aed">TIER 2 - TRANSFERABLE WITH ADAPTATION</text>
      <text x="60" y="194" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">5. Widget-as-event-log - 6. The DB claim queue - 7. The lateness cutoff - 8. The event-carried retry - 9. mark_sanitized - 10. Bot-as-user</text>

      <rect x="40" y="230" width="880" height="66" rx="8" fill="var(--surface-card, #ffffff)" stroke="var(--border-color, #e2e8f0)" stroke-width="1.4"/>
      <text x="60" y="252" font-family="system-ui, sans-serif" font-size="11.5" font-weight="700" fill="var(--text-primary, #0f172a)">TIER 3 - DECISIONS WORTH COPYING, NOT MECHANISMS</text>
      <text x="60" y="274" font-family="system-ui, sans-serif" font-size="10.5" fill="var(--text-secondary, #475569)">11. The numeric audit-log namespace (a data model that documents its own topology) - 12. AGENTS.md + path-scoped .claude/rules</text>

      <text x="40" y="332" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE VERDICT</text>
      ${card(40, 344, 280, 116, 'THE POLE MAP', [
        'P1 real but deliberately TINY',
        'P2 the STRONGEST in the study',
        'P3 plumbing, not a product',
        'PX-W the first REAL widget model',
        { text: 'PX-F old-school - PZ the densest', color: '#059669' }
      ])}
      ${card(340, 344, 280, 116, 'THE ONE ANSWER', [
        { text: '"Make the wrong thing hard to do,', color: '#7c3aed' },
        { text: 'then catch the rest automatically."', color: '#7c3aed' },
        'A set of guardrails that',
        'happened to ship a chat app',
        { text: 'the method IS the architecture', color: '#059669' }
      ])}
      ${card(640, 344, 280, 116, 'THREE THINGS NOBODY ELSE HAD', [
        'The first real widget model',
        'The strongest P2 (identity-embedded)',
        'The densest PZ',
        { text: 'check-schemas - the ratchet -', color: '#059669' },
        { text: 'mark_sanitized - AGENTS.md', color: '#059669' }
      ])}

      <text x="40" y="496" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="var(--text-secondary, #475569)">THE HONEST LEDGER - stated in the code's own words</text>
      ${card(40, 508, 290, 44, 'RECORDED', [
        '30 divergences - 6 named unfixed gaps - 3 retirements'
      ], { sw: 1.2 })}
      ${card(345, 508, 290, 44, 'THE COST', [
        'no RLS - the taint hatch is TRUST - the AI policy is ADVISORY'
      ], { sw: 1.2 })}
      ${card(650, 508, 270, 44, 'THE RECOMMENDATION', [
        'take 1, 2 and 3 first - the cheapest, and they change what a future bug looks like'
      ], { sw: 1.2 })}
    </svg>
  </div>
</div>`;

    default: return `
<div class="diagram-wrapper">
  <div class="diagram-header">
    <div class="diagram-badge">BATCH ${batchNum}</div>
    <h4>Zulip Platform Study</h4>
    <p>See the batch markdown for the full evidence.</p>
  </div>
  <div class="diagram-svg-container">
    <svg viewBox="0 0 960 200" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
${arrowDefs('b' + batchNum)}
      <text x="480" y="110" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="var(--diagram-accent, #7c3aed)">Zulip 12.0-dev+git - Batch ${batchNum}</text>
    </svg>
  </div>
</div>`;
  }
}

const DIAGRAMS_CATALOG = [
  { id: 'master', batchNum: 'master', title: 'Executive Topology: three process families, the ambient realm, and the densest guard culture', category: 'Strategic Architecture',
    description: 'The three poles, the first real widget model, and the one structural answer.' },
  { id: '00', batchNum: '00', title: 'Batch 00: The pin, the extraction, and the two counting traps', category: 'Foundations',
    description: '99.92% extract; a numbering ceiling is not a count; the xargs 30x undercount.' },
  { id: '01', batchNum: '01', title: 'Batch 01: The platform - one codebase, three entry points, four stores', category: 'Foundations',
    description: 'The first multi-process server in the study; 119 hand-written REST paths.' },
  { id: '02', batchNum: '02', title: 'Batch 02: The aissistant - one LLM feature, five fences', category: 'Pole 1 - The Aissistant',
    description: 'F1-F5, the bot-as-user primitive, and the named cost-cap race.' },
  { id: '03', batchNum: '03', title: 'Batch 03: The workspace - the ambient realm', category: 'Pole 2 - The Workspace',
    description: 'Host header to subdomain, one comparison as the fence, and the audit-log namespace.' },
  { id: '04', batchNum: '04', title: 'Batch 04: Automations - the claim queue and the 10-minute cutoff', category: 'Pole 3 - Automations',
    description: 'M1-M5, exactly-one-worker-per-message, and the latency-limit primitive.' },
  { id: '05', batchNum: '05', title: 'Batch 05: Widgets and frontend - an event log, not a config object', category: 'Cross-Cutting',
    description: 'State by replay, the zod union, zform, the tictactoe scar, and jQuery PX-F.' },
  { id: '06', batchNum: '06', title: 'Batch 06: Out-of-pole - the densest guard culture in the study', category: 'Escape Hatch',
    description: 'check-schemas across three representations; the ratchet; mark_sanitized; AGENTS.md.' },
  { id: '07', batchNum: '07', title: 'Batch 07: The synthesis - three tiers, one answer, an honest ledger', category: 'Strategic Decision',
    description: 'What we take, what we adapt, and what Zulip says about its own limits.' }
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
