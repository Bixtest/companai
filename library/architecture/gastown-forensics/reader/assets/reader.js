// Gas Town Platform Study — Master Reader Controller
// Handles font scaling, themes, scrollspy, SPA routing, full-text search, architecture switcher & gallery modal

(function() {
  'use strict';

  // Application State
  const state = {
    currentDocId: 'batch-00',
    currentActiveDiagramId: 'default',
    galleryActiveDiagramId: null,
    fontSize: 16,
    theme: 'light',
    fontFamily: 'sans',
    widthMode: 'standard',
    viewMode: 'rendered', // 'rendered' | 'raw'
    diagramVisible: true
  };

  // DOM Elements Cache
  let dom = {};

  function init() {
    cacheDom();
    loadPreferences();
    setupEventListeners();
    setupRouting();
    renderCurrentDoc();
  }

  function cacheDom() {
    dom = {
      app: document.body,
      progressBar: document.getElementById('readingProgressBar'),
      canvas: document.getElementById('readerCanvas'),
      contentArea: document.getElementById('renderedContent'),
      rawContentArea: document.getElementById('rawContentArea'),
      docSealStats: document.getElementById('docSealStats'),
      diagramContainer: document.getElementById('diagramContainer'),
      diagramSection: document.getElementById('diagramSection'),
      diagramToggleBtn: document.getElementById('diagramToggleBtn'),
      diagramSelect: document.getElementById('diagramSelect'),
      openGalleryBtn: document.getElementById('openGalleryBtn'),
      headerGalleryBtn: document.getElementById('headerGalleryBtn'),
      readerGalleryBtn: document.getElementById('readerGalleryBtn'),
      galleryModal: document.getElementById('galleryModal'),
      closeGalleryBtn: document.getElementById('closeGalleryBtn'),
      galleryCardsGrid: document.getElementById('galleryCardsGrid'),
      galleryDetailContainer: document.getElementById('galleryDetailContainer'),
      galleryDetailTitle: document.getElementById('galleryDetailTitle'),
      galleryDetailSvg: document.getElementById('galleryDetailSvg'),
      backToGalleryGridBtn: document.getElementById('backToGalleryGridBtn'),
      galleryJumpToDocBtn: document.getElementById('galleryJumpToDocBtn'),
      tocContainer: document.getElementById('tocList'),
      sidebarLeft: document.getElementById('sidebarLeft'),
      sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
      fontSizeSlider: document.getElementById('fontSizeSlider'),
      fontSizeVal: document.getElementById('fontSizeVal'),
      fontDecBtn: document.getElementById('fontDecBtn'),
      fontIncBtn: document.getElementById('fontIncBtn'),
      fontResetBtn: document.getElementById('fontResetBtn'),
      fontSelect: document.getElementById('fontSelect'),
      widthSelect: document.getElementById('widthSelect'),
      themePills: document.querySelectorAll('.theme-pill'),
      viewRenderedBtn: document.getElementById('viewRenderedBtn'),
      viewRawBtn: document.getElementById('viewRawBtn'),
      prevDocBtn: document.getElementById('prevDocBtn'),
      nextDocBtn: document.getElementById('nextDocBtn'),
      prevDocTitle: document.getElementById('prevDocTitle'),
      nextDocTitle: document.getElementById('nextDocTitle'),
      searchTrigger: document.getElementById('searchTrigger'),
      searchModal: document.getElementById('searchModal'),
      modalSearchInput: document.getElementById('modalSearchInput'),
      modalResultsList: document.getElementById('modalResultsList'),
      closeSearchBtn: document.getElementById('closeSearchBtn'),
      sidebarFilterInput: document.getElementById('sidebarFilterInput')
    };
  }

  // Preferences (localStorage)
  function loadPreferences() {
    const savedSize = localStorage.getItem('gastown_reader_font_size');
    if (savedSize) {
      state.fontSize = parseInt(savedSize, 10);
    }
    applyFontSize(state.fontSize);

    const savedTheme = localStorage.getItem('gastown_reader_theme');
    if (savedTheme) {
      state.theme = savedTheme;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      state.theme = 'dark';
    }
    applyTheme(state.theme);

    const savedFont = localStorage.getItem('gastown_reader_font');
    if (savedFont) {
      state.fontFamily = savedFont;
      if (dom.fontSelect) dom.fontSelect.value = savedFont;
      applyFontFamily(savedFont);
    }

    const savedWidth = localStorage.getItem('gastown_reader_width');
    if (savedWidth) {
      state.widthMode = savedWidth;
      if (dom.widthSelect) dom.widthSelect.value = savedWidth;
      applyWidthMode(savedWidth);
    }
  }

  function applyFontSize(size) {
    state.fontSize = Math.min(Math.max(size, 12), 28);
    document.documentElement.style.setProperty('--content-font-size', `${state.fontSize}px`);
    if (dom.fontSizeSlider) dom.fontSizeSlider.value = state.fontSize;
    if (dom.fontSizeVal) {
      const pct = Math.round((state.fontSize / 16) * 100);
      dom.fontSizeVal.textContent = `${pct}% (${state.fontSize}px)`;
    }
    localStorage.setItem('gastown_reader_font_size', state.fontSize);
  }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (dom.themePills) {
      dom.themePills.forEach(pill => {
        pill.classList.toggle('active', pill.dataset.theme === theme);
      });
    }
    localStorage.setItem('gastown_reader_theme', theme);
  }

  function applyFontFamily(font) {
    state.fontFamily = font;
    document.body.setAttribute('data-font', font);
    localStorage.setItem('gastown_reader_font', font);
  }

  function applyWidthMode(mode) {
    state.widthMode = mode;
    let maxWidth = '900px';
    if (mode === 'reading') maxWidth = '760px';
    if (mode === 'wide') maxWidth = '1180px';
    if (mode === 'full') maxWidth = '100%';
    document.documentElement.style.setProperty('--content-max-width', maxWidth);
    localStorage.setItem('gastown_reader_width', mode);
  }

  // Event Listeners
  function setupEventListeners() {
    // Font Slider
    if (dom.fontSizeSlider) {
      dom.fontSizeSlider.addEventListener('input', (e) => {
        applyFontSize(parseInt(e.target.value, 10));
      });
    }

    if (dom.fontDecBtn) {
      dom.fontDecBtn.addEventListener('click', () => applyFontSize(state.fontSize - 1));
    }
    if (dom.fontIncBtn) {
      dom.fontIncBtn.addEventListener('click', () => applyFontSize(state.fontSize + 1));
    }
    if (dom.fontResetBtn) {
      dom.fontResetBtn.addEventListener('click', () => applyFontSize(16));
    }

    // Font Family
    if (dom.fontSelect) {
      dom.fontSelect.addEventListener('change', (e) => applyFontFamily(e.target.value));
    }

    // Width Mode
    if (dom.widthSelect) {
      dom.widthSelect.addEventListener('change', (e) => applyWidthMode(e.target.value));
    }

    // Themes
    if (dom.themePills) {
      dom.themePills.forEach(pill => {
        pill.addEventListener('click', () => applyTheme(pill.dataset.theme));
      });
    }

    // View Toggle
    if (dom.viewRenderedBtn) {
      dom.viewRenderedBtn.addEventListener('click', () => setViewMode('rendered'));
    }
    if (dom.viewRawBtn) {
      dom.viewRawBtn.addEventListener('click', () => setViewMode('raw'));
    }

    // Diagram Toggle
    if (dom.diagramToggleBtn) {
      dom.diagramToggleBtn.addEventListener('click', toggleDiagram);
    }

    // Diagram Select (In-Document Switcher)
    if (dom.diagramSelect) {
      dom.diagramSelect.addEventListener('change', (e) => {
        switchDiagram(e.target.value);
      });
    }

    // Architecture Gallery Modals Triggers
    if (dom.headerGalleryBtn) {
      dom.headerGalleryBtn.addEventListener('click', openGalleryModal);
    }
    if (dom.openGalleryBtn) {
      dom.openGalleryBtn.addEventListener('click', openGalleryModal);
    }
    if (dom.readerGalleryBtn) {
      dom.readerGalleryBtn.addEventListener('click', openGalleryModal);
    }
    if (dom.closeGalleryBtn) {
      dom.closeGalleryBtn.addEventListener('click', closeGalleryModal);
    }
    if (dom.backToGalleryGridBtn) {
      dom.backToGalleryGridBtn.addEventListener('click', () => {
        if (dom.galleryDetailContainer) dom.galleryDetailContainer.style.display = 'none';
        if (dom.galleryCardsGrid) dom.galleryCardsGrid.style.display = 'grid';
      });
    }
    if (dom.galleryJumpToDocBtn) {
      dom.galleryJumpToDocBtn.addEventListener('click', () => {
        if (state.galleryActiveDiagramId) {
          const docId = state.galleryActiveDiagramId === 'master' ? 'batch-00' : `batch-${state.galleryActiveDiagramId}`;
          closeGalleryModal();
          window.location.hash = `#${docId}`;
        }
      });
    }
    if (dom.galleryModal) {
      dom.galleryModal.addEventListener('click', (e) => {
        if (e.target === dom.galleryModal) closeGalleryModal();
      });
    }

    // Reading Scroll Progress & Scrollspy
    if (dom.canvas) {
      dom.canvas.addEventListener('scroll', handleCanvasScroll);
    }

    // Sidebar Mobile Toggle
    if (dom.sidebarToggleBtn) {
      dom.sidebarToggleBtn.addEventListener('click', () => {
        dom.sidebarLeft.classList.toggle('open');
      });
    }

    // Sidebar Filter
    if (dom.sidebarFilterInput) {
      dom.sidebarFilterInput.addEventListener('input', (e) => {
        filterSidebar(e.target.value.toLowerCase());
      });
    }

    // Search Modal
    if (dom.searchTrigger) {
      dom.searchTrigger.addEventListener('click', openSearchModal);
    }
    if (dom.closeSearchBtn) {
      dom.closeSearchBtn.addEventListener('click', closeSearchModal);
    }
    if (dom.searchModal) {
      dom.searchModal.addEventListener('click', (e) => {
        if (e.target === dom.searchModal) closeSearchModal();
      });
    }
    if (dom.modalSearchInput) {
      dom.modalSearchInput.addEventListener('input', (e) => {
        executeGlobalSearch(e.target.value);
      });
    }

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !isInputActive()) {
        e.preventDefault();
        openSearchModal();
      } else if ((e.key === 'a' || e.key === 'A') && !isInputActive()) {
        e.preventDefault();
        openGalleryModal();
      } else if (e.key === 'Escape') {
        closeSearchModal();
        closeGalleryModal();
        if (dom.sidebarLeft) dom.sidebarLeft.classList.remove('open');
      } else if (e.key === '[' && !isInputActive()) {
        e.preventDefault();
        navigateDoc(-1);
      } else if (e.key === ']' && !isInputActive()) {
        e.preventDefault();
        navigateDoc(1);
      }
    });

    // Code copy buttons delegate
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('code-copy-btn')) {
        const pre = e.target.closest('.code-block-wrapper').querySelector('pre');
        if (pre) {
          navigator.clipboard.writeText(pre.innerText).then(() => {
            const originalText = e.target.textContent;
            e.target.textContent = 'Copied! ✓';
            setTimeout(() => { e.target.textContent = originalText; }, 2000);
          });
        }
      }
    });
  }

  function isInputActive() {
    return document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  }

  // Routing
  function setupRouting() {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
  }

  function handleHashChange() {
    let hash = window.location.hash.replace(/^#/, '');
    if (!hash) {
      hash = 'batch-00';
    }

    let [docId, anchorId] = hash.split('/');
    if (window.DOCS_DATA && window.DOCS_DATA[docId]) {
      state.currentDocId = docId;
      renderCurrentDoc();
      if (anchorId) {
        setTimeout(() => {
          const el = document.getElementById(anchorId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      state.currentDocId = 'batch-00';
      renderCurrentDoc();
    }
  }

  // View Mode
  function setViewMode(mode) {
    state.viewMode = mode;
    if (dom.viewRenderedBtn) dom.viewRenderedBtn.classList.toggle('active', mode === 'rendered');
    if (dom.viewRawBtn) dom.viewRawBtn.classList.toggle('active', mode === 'raw');

    if (mode === 'rendered') {
      dom.contentArea.style.display = 'block';
      dom.rawContentArea.style.display = 'none';
      if (dom.diagramSection) dom.diagramSection.style.display = 'block';
    } else {
      dom.contentArea.style.display = 'none';
      dom.rawContentArea.style.display = 'block';
      if (dom.diagramSection) dom.diagramSection.style.display = 'none';
    }
  }

  function toggleDiagram() {
    state.diagramVisible = !state.diagramVisible;
    if (dom.diagramSection) {
      dom.diagramSection.classList.toggle('collapsed', !state.diagramVisible);
    }
    const indicator = document.getElementById('diagramToggleIcon');
    if (indicator) {
      indicator.textContent = state.diagramVisible ? '▼ Collapse' : '▶ Expand Guide';
    }
  }

  // Architecture Switcher Function
  function switchDiagram(diagramId) {
    state.currentActiveDiagramId = diagramId;
    if (!dom.diagramContainer) return;

    if (diagramId === 'default') {
      const doc = window.DOCS_DATA[state.currentDocId];
      if (doc) dom.diagramContainer.innerHTML = doc.diagramHtml;
    } else if (window.DIAGRAMS_MAP && window.DIAGRAMS_MAP[diagramId]) {
      dom.diagramContainer.innerHTML = window.DIAGRAMS_MAP[diagramId].html;
    }

    if (dom.diagramSelect) {
      dom.diagramSelect.value = diagramId;
    }

    // Ensure diagram section is un-collapsed so it's visible
    if (dom.diagramSection && dom.diagramSection.classList.contains('collapsed')) {
      dom.diagramSection.classList.remove('collapsed');
      state.diagramVisible = true;
      const indicator = document.getElementById('diagramToggleIcon');
      if (indicator) indicator.textContent = '▼ Collapse';
    }

    dom.diagramContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Architecture Gallery Modal
  function openGalleryModal() {
    if (!dom.galleryModal) return;
    dom.galleryModal.classList.add('open');

    // Reset view to grid
    if (dom.galleryDetailContainer) dom.galleryDetailContainer.style.display = 'none';
    if (dom.galleryCardsGrid) {
      dom.galleryCardsGrid.style.display = 'grid';
      renderGalleryCards();
    }
  }

  function closeGalleryModal() {
    if (dom.galleryModal) dom.galleryModal.classList.remove('open');
  }

  function renderGalleryCards() {
    if (!dom.galleryCardsGrid || !window.DIAGRAMS_CATALOG) return;

    dom.galleryCardsGrid.innerHTML = window.DIAGRAMS_CATALOG.map(item => `
      <div class="gallery-card" onclick="window.GasTownReader.showDiagramModal('${item.id}')">
        <div class="gallery-card-top">
          <span class="gallery-card-cat">${escapeHtml(item.category)}</span>
          <span style="font-size:0.75rem; font-weight:700; color:var(--text-muted); font-family:var(--font-family-mono);">${item.batchNum === 'all' ? 'OVERVIEW' : 'BATCH ' + item.batchNum}</span>
        </div>
        <div class="gallery-card-title">${escapeHtml(item.title)}</div>
        <div class="gallery-card-desc">${escapeHtml(item.description)}</div>
        <div class="gallery-card-btn">
          <span>Inspect Architecture Model</span>
          <span>→</span>
        </div>
      </div>
    `).join('');
  }

  function showDiagramModal(diagramId) {
    if (!window.DIAGRAMS_MAP || !window.DIAGRAMS_MAP[diagramId]) return;
    state.galleryActiveDiagramId = diagramId;

    const catalogItem = (window.DIAGRAMS_CATALOG || []).find(c => c.id === diagramId);
    const title = catalogItem ? catalogItem.title : `Architecture Diagram (${diagramId})`;

    if (dom.galleryCardsGrid) dom.galleryCardsGrid.style.display = 'none';
    if (dom.galleryDetailContainer) {
      dom.galleryDetailContainer.style.display = 'flex';
      if (dom.galleryDetailTitle) dom.galleryDetailTitle.textContent = title;
      if (dom.galleryDetailSvg) dom.galleryDetailSvg.innerHTML = window.DIAGRAMS_MAP[diagramId].html;
      if (dom.galleryJumpToDocBtn) {
        const batchNum = catalogItem ? catalogItem.batchNum : '00';
        dom.galleryJumpToDocBtn.textContent = batchNum === 'all' ? 'Open Batch 00 →' : `Open Batch ${batchNum} →`;
      }
    }

    if (dom.galleryModal && !dom.galleryModal.classList.contains('open')) {
      dom.galleryModal.classList.add('open');
    }
  }

  // Rendering Document
  function renderCurrentDoc() {
    if (!window.DOCS_DATA) return;
    const doc = window.DOCS_DATA[state.currentDocId];
    if (!doc) return;

    // Update document title
    document.title = `${doc.title} — Gas Town Platform Study`;

    // Render Seal & Metadata
    if (dom.docSealStats) {
      dom.docSealStats.innerHTML = `
        <div class="seal-stat-item">
          <span class="stat-label">Document Status</span>
          <span class="stat-value" style="color: ${doc.status === 'COMPLETE' ? '#4f46e5' : doc.status === 'DONE' ? '#059669' : '#d97706'}">${doc.status}</span>
        </div>
        <div class="seal-stat-item">
          <span class="stat-label">Text Fidelity</span>
          <span class="stat-value" style="color: #059669;">100% UNABRIDGED</span>
        </div>
        <div class="seal-stat-item">
          <span class="stat-label">Word Count</span>
          <span class="stat-value">${doc.stats.wordCount.toLocaleString()}</span>
        </div>
        <div class="seal-stat-item">
          <span class="stat-label">Est. Reading Time</span>
          <span class="stat-value">${doc.stats.readTimeMinutes} min</span>
        </div>
        <div class="seal-stat-item">
          <span class="stat-label">Source Lines</span>
          <span class="stat-value">${doc.stats.lineCount}</span>
        </div>
        <div class="seal-stat-item">
          <span class="stat-label">Verified Date</span>
          <span class="stat-value">${doc.date}</span>
        </div>
      `;
    }

    // Reset Diagram to Document Default
    state.currentActiveDiagramId = 'default';
    if (dom.diagramSelect) dom.diagramSelect.value = 'default';
    if (dom.diagramContainer) {
      dom.diagramContainer.innerHTML = doc.diagramHtml || '';
    }

    // Render HTML content
    if (dom.contentArea) {
      dom.contentArea.innerHTML = doc.html;
    }

    // Render Raw Markdown
    if (dom.rawContentArea) {
      dom.rawContentArea.textContent = doc.rawMarkdown;
    }

    // Render Table of Contents
    renderToc(doc.toc);

    // Update Navigation Buttons (Prev / Next)
    updateNavButtons();

    // Update Sidebar Active state
    updateSidebarActive();

    // Scroll to top
    if (dom.canvas) {
      dom.canvas.scrollTop = 0;
    }

    // Reset view mode to rendered
    setViewMode(state.viewMode);
  }

  function renderToc(tocList) {
    if (!dom.tocContainer) return;
    if (!tocList || tocList.length === 0) {
      dom.tocContainer.innerHTML = '<li class="toc-item"><span style="color: var(--text-muted);">No subheadings</span></li>';
      return;
    }

    dom.tocContainer.innerHTML = tocList.map(item => `
      <li class="toc-item level-${item.level}">
        <a href="#${state.currentDocId}/${item.id}" class="toc-link" data-target="${item.id}">
          ${escapeHtml(item.text)}
        </a>
      </li>
    `).join('');
  }

  function updateSidebarActive() {
    const items = document.querySelectorAll('.doc-nav-item');
    items.forEach(item => {
      item.classList.toggle('active', item.dataset.id === state.currentDocId);
    });
  }

  function updateNavButtons() {
    const keys = Object.keys(window.DOCS_DATA);
    const currentIndex = keys.indexOf(state.currentDocId);

    // Previous
    if (currentIndex > 0) {
      const prevDoc = window.DOCS_DATA[keys[currentIndex - 1]];
      dom.prevDocBtn.style.visibility = 'visible';
      dom.prevDocBtn.href = `#${prevDoc.id}`;
      dom.prevDocTitle.textContent = prevDoc.shortTitle;
    } else {
      dom.prevDocBtn.style.visibility = 'hidden';
    }

    // Next
    if (currentIndex < keys.length - 1) {
      const nextDoc = window.DOCS_DATA[keys[currentIndex + 1]];
      dom.nextDocBtn.style.visibility = 'visible';
      dom.nextDocBtn.href = `#${nextDoc.id}`;
      dom.nextDocTitle.textContent = nextDoc.shortTitle;
    } else {
      dom.nextDocBtn.style.visibility = 'hidden';
    }
  }

  function navigateDoc(direction) {
    const keys = Object.keys(window.DOCS_DATA);
    const currentIndex = keys.indexOf(state.currentDocId);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < keys.length) {
      window.location.hash = `#${keys[newIndex]}`;
    }
  }

  // Scroll Progress & ScrollSpy
  function handleCanvasScroll() {
    if (!dom.canvas) return;

    // Progress bar
    const totalScroll = dom.canvas.scrollHeight - dom.canvas.clientHeight;
    const progress = totalScroll > 0 ? (dom.canvas.scrollTop / totalScroll) * 100 : 0;
    if (dom.progressBar) {
      dom.progressBar.style.width = `${progress}%`;
    }

    // Scrollspy for TOC
    const headings = dom.contentArea.querySelectorAll('h1, h2, h3, h4');
    let currentHeadingId = null;
    const canvasTop = dom.canvas.getBoundingClientRect().top;

    headings.forEach(heading => {
      const rect = heading.getBoundingClientRect();
      if (rect.top - canvasTop <= 80) {
        currentHeadingId = heading.id;
      }
    });

    if (currentHeadingId) {
      const tocLinks = dom.tocContainer.querySelectorAll('.toc-link');
      tocLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.target === currentHeadingId);
      });
    }
  }

  // Sidebar Filter
  function filterSidebar(query) {
    const items = document.querySelectorAll('.doc-nav-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(query) ? 'flex' : 'none';
    });
  }

  // Global Search
  function openSearchModal() {
    if (!dom.searchModal) return;
    dom.searchModal.classList.add('open');
    if (dom.modalSearchInput) {
      dom.modalSearchInput.value = '';
      dom.modalSearchInput.focus();
    }
    dom.modalResultsList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Type to search across all forensic documents...</div>';
  }

  function closeSearchModal() {
    if (dom.searchModal) dom.searchModal.classList.remove('open');
  }

  function executeGlobalSearch(query) {
    if (!query || query.trim().length < 2) {
      dom.modalResultsList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">Type at least 2 characters to search...</div>';
      return;
    }

    const q = query.toLowerCase();
    const results = [];

    Object.values(window.DOCS_DATA).forEach(doc => {
      // Check title
      if (doc.title.toLowerCase().includes(q)) {
        results.push({
          docId: doc.id,
          batchNum: doc.batchNum,
          heading: doc.shortTitle,
          targetId: '',
          snippet: `Document Title Match: ${doc.title}`
        });
      }

      // Check headings
      doc.toc.forEach(h => {
        if (h.text.toLowerCase().includes(q)) {
          results.push({
            docId: doc.id,
            batchNum: doc.batchNum,
            heading: h.text,
            targetId: h.id,
            snippet: `Section Header: ${h.text}`
          });
        }
      });

      // Check raw markdown body for snippets
      const lines = doc.rawMarkdown.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(q) && !line.startsWith('#')) {
          results.push({
            docId: doc.id,
            batchNum: doc.batchNum,
            heading: doc.shortTitle,
            targetId: '',
            snippet: line.trim()
          });
          if (results.length > 40) break; // limit
        }
      }
    });

    if (results.length === 0) {
      dom.modalResultsList.innerHTML = '<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No matches found for "' + escapeHtml(query) + '"</div>';
      return;
    }

    dom.modalResultsList.innerHTML = results.slice(0, 25).map(res => `
      <div class="search-result-item" onclick="window.GasTownReader.jumpTo('${res.docId}', '${res.targetId}')">
        <div class="result-batch-tag">Batch ${res.batchNum} • ${escapeHtml(res.heading)}</div>
        <div class="result-snippet">${highlightQuery(res.snippet, query)}</div>
      </div>
    `).join('');
  }

  function highlightQuery(text, query) {
    if (!text) return '';
    const escaped = escapeHtml(text.length > 150 ? text.substring(0, 150) + '...' : text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return escaped.replace(regex, '<span class="highlight-match">$1</span>');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Public API
  window.GasTownReader = {
    jumpTo: function(docId, targetId) {
      closeSearchModal();
      window.location.hash = targetId ? `#${docId}/${targetId}` : `#${docId}`;
    },
    switchDiagram: function(id) {
      switchDiagram(id);
    },
    openGalleryModal: function() {
      openGalleryModal();
    },
    closeGalleryModal: function() {
      closeGalleryModal();
    },
    showDiagramModal: function(id) {
      showDiagramModal(id);
    }
  };

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
