// HubSpot Highlighter - Content Script
// Customize the rules below to match your team's needs

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION - Edit these rules!
  // ============================================
  
  const CONFIG = {
    // Enable/disable features
    enabled: true,
    showIndicator: true, // Show "Highlighter Active" badge
    
    // Keywords that trigger urgent highlighting (case-insensitive)
    urgentKeywords: ['urgent', 'haster', 'kritisk', 'critical', 'asap'],
    
    // Keywords that trigger warning highlighting
    warningKeywords: ['important', 'viktig', 'snart', 'soon'],
    
    // Days after which a ticket is considered "aged"
    agedTicketDays: 7,
    
    // Highlight unassigned tickets
    highlightUnassigned: true,
    
    // Custom category highlights (category text -> highlight type)
    categoryHighlights: {
      'bug': 'urgent',
      'feil': 'urgent',
      'error': 'urgent',
      'hosting agreement request': 'info'
    },
    
    // Owner-based highlights (owner name -> highlight type)
    ownerHighlights: {
      // Example: 'Nadire Chayer': 'info'
    }
  };

  // ============================================
  // HIGHLIGHT LOGIC
  // ============================================

  function highlightElements() {
    if (!CONFIG.enabled) return;

    // Highlight ticket cards on board views
    highlightTicketCards();
    
    // Highlight table rows (list view)
    highlightTableRows();
    
    // Show indicator if enabled
    if (CONFIG.showIndicator) {
      showActiveIndicator();
    }
  }

  function getCardWrapper(element) {
    // Find the actual card container - walk up to find the draggable card wrapper
    let current = element;
    while (current && current !== document.body) {
      // Look for common card wrapper patterns
      if (current.getAttribute('data-rbd-draggable-id') || 
          current.classList.toString().includes('BoardCard') ||
          current.classList.toString().includes('DraggableCard')) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  function highlightTicketCards() {
    // Target the title hover container which exists on each card
    const cardContainers = document.querySelectorAll('[data-test-id="title-hover-container"]');
    
    console.log(`🎨 Found ${cardContainers.length} ticket cards`);
    
    cardContainers.forEach(container => {
      // Get the full card (parent wrapper)
      const card = getCardWrapper(container) || container.closest('[class*="Card"]') || container;
      
      // Skip if already processed
      if (card.dataset.hsHighlighted) return;
      card.dataset.hsHighlighted = 'true';
      
      const text = container.textContent.toLowerCase();
      
      // Get title
      const titleEl = container.querySelector('[data-test-id="board-card-section-title-link"]');
      const title = titleEl ? titleEl.textContent.toLowerCase() : '';
      
      // Check for Ticket owner by looking for the label
      const propertyLabels = container.querySelectorAll('[data-test-id="cdbc-property-label"]');
      let hasOwner = false;
      let category = '';
      
      propertyLabels.forEach(label => {
        const labelText = label.textContent.toLowerCase();
        if (labelText.includes('ticket owner') || labelText.includes('eier') || labelText.includes('owner')) {
          hasOwner = true;
        }
        if (labelText.includes('category') || labelText.includes('kategori')) {
          // Get the value next to this label
          const valueEl = label.parentElement?.querySelector('[data-test-id="cdbc-property-value"]');
          if (valueEl) {
            category = valueEl.textContent.toLowerCase();
          }
        }
      });
      
      // Get "Open for X days" text
      const timeOpenEl = container.querySelector('[data-test-id="ticket-time-open"]');
      const timeOpenText = timeOpenEl ? timeOpenEl.textContent : '';
      
      // Parse days open
      let daysOpen = 0;
      const daysMatch = timeOpenText.match(/(\d+)\s*(dag|day)/i);
      if (daysMatch) {
        daysOpen = parseInt(daysMatch[1]);
      }
      
      // Check for unassigned - ticket is unassigned if there's no owner property
      const isUnassigned = !hasOwner;
      
      // Apply highlights based on priority
      let highlightType = null;
      
      // 1. Check urgent keywords in title
      if (CONFIG.urgentKeywords.some(kw => title.includes(kw.toLowerCase()))) {
        highlightType = 'urgent';
      }
      // 2. Check warning keywords in title
      else if (CONFIG.warningKeywords.some(kw => title.includes(kw.toLowerCase()))) {
        highlightType = 'warning';
      }
      // 3. Check category highlights
      else if (category && CONFIG.categoryHighlights[category]) {
        highlightType = CONFIG.categoryHighlights[category];
      }
      // 4. Check if aged
      else if (daysOpen >= CONFIG.agedTicketDays) {
        highlightType = 'aged';
      }
      // 5. Check unassigned
      else if (CONFIG.highlightUnassigned && isUnassigned) {
        highlightType = 'unassigned';
      }
      
      // Apply the highlight
      applyCardHighlight(card, highlightType, { daysOpen, isUnassigned, hasOwner });
    });
  }

  function applyCardHighlight(card, type, info) {
    // Reset previous highlights
    card.classList.remove('hs-card-urgent', 'hs-card-warning', 'hs-card-info', 'hs-card-aged', 'hs-card-unassigned');
    
    if (!type) return;
    
    card.classList.add(`hs-card-${type}`);
    
    // Log for debugging
    console.log(`🎨 Highlighted card as ${type}:`, card.querySelector('[data-test-id="board-card-section-title-link"]')?.textContent?.trim());
  }

  function highlightTableRows() {
    // Find all table rows in HubSpot list views
    const rows = document.querySelectorAll('table tbody tr, [data-selenium-test="table-row"]');
    
    rows.forEach(row => {
      if (row.dataset.hsHighlighted) return;
      row.dataset.hsHighlighted = 'true';
      
      const text = row.textContent.toLowerCase();
      
      // Check for urgent keywords
      if (CONFIG.urgentKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        row.classList.add('hs-row-urgent');
        return;
      }
      
      // Check for warning keywords
      if (CONFIG.warningKeywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        row.classList.add('hs-row-warning');
        return;
      }
      
      // Check for unassigned
      if (CONFIG.highlightUnassigned) {
        const unassignedIndicators = ['unassigned', 'ikke tildelt', '--'];
        if (unassignedIndicators.some(indicator => text.includes(indicator.toLowerCase()))) {
          row.classList.add('hs-row-warning', 'hs-unassigned');
        }
      }
    });
  }

  function showActiveIndicator() {
    if (document.querySelector('.hs-highlighter-active')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'hs-highlighter-active';
    indicator.textContent = '🎨 Highlighter Active';
    document.body.appendChild(indicator);
    
    // Flash on page load
    setTimeout(() => indicator.classList.add('visible'), 500);
    setTimeout(() => indicator.classList.remove('visible'), 3000);
  }

  // ============================================
  // MUTATION OBSERVER - Watch for DOM changes
  // ============================================

  let debounceTimer;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(highlightElements, 200);
  });

  // Start observing when DOM is ready
  function init() {
    // Initial highlight pass
    highlightElements();
    
    // Watch for dynamic content
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('🎨 HubSpot Highlighter loaded');
  }

  // Load saved settings
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.sync.get(['highlighterConfig'], (result) => {
      if (result.highlighterConfig) {
        Object.assign(CONFIG, result.highlighterConfig);
      }
      init();
    });
  } else {
    init();
  }

  // Listen for settings updates
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.highlighterConfig) {
        Object.assign(CONFIG, changes.highlighterConfig.newValue);
        highlightElements();
      }
    });
  }

})();
