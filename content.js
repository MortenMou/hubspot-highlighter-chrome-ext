// HubSpot Highlighter - Content Script
// Only runs on ticket pages (objects/0-5)

(function() {
  'use strict';

  // ============================================
  // CHECK IF WE'RE ON A TICKET PAGE
  // ============================================
  
  function isTicketPage() {
    // 0-5 is the HubSpot object type ID for tickets
    return window.location.href.includes('/objects/0-5/') || 
           window.location.href.includes('/tickets/');
  }

  // Exit early if not on a ticket page
  if (!isTicketPage()) {
    console.log('🎨 HubSpot Highlighter: Not a ticket page, skipping');
    return;
  }

  // ============================================
  // CONFIGURATION - Edit these rules!
  // ============================================
  
  const CONFIG = {
    // Enable/disable features
    enabled: true,
    showIndicator: true, // Show "Highlighter Active" badge
    
    // Keywords that trigger urgent highlighting (case-insensitive)
    urgentKeywords: ['urgent', 'haster', 'kritisk', 'critical', 'asap'],
    
    // Age-based highlighting thresholds (in days since last activity)
    freshTicketDays: 2,    // 0 to this = green (fresh)
    warningTicketDays: 5,  // freshTicketDays+1 to this = yellow (needs attention)
                           // above this = purple (overdue)
    
    // Highlight unassigned tickets
    highlightUnassigned: true,
    
    // Custom category highlights (category text -> highlight type)
    categoryHighlights: {
      'bug': 'urgent',
      'feil': 'urgent',
      'error': 'urgent'
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  function getDaysSinceDate(dateString) {
    // Parse date string like "2026-01-14"
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // ============================================
  // HIGHLIGHT LOGIC
  // ============================================

  function highlightElements() {
    if (!CONFIG.enabled) return;
    
    // Double-check we're still on a ticket page (for SPA navigation)
    if (!isTicketPage()) return;

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

  function getAgeHighlightType(daysSinceActivity) {
    // Returns highlight type based on days since last activity
    if (daysSinceActivity <= CONFIG.freshTicketDays) {
      return 'fresh';      // Green - good response time
    } else if (daysSinceActivity <= CONFIG.warningTicketDays) {
      return 'attention';  // Yellow - needs attention
    } else {
      return 'overdue';    // Purple - overdue
    }
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
      
      // Get title
      const titleEl = container.querySelector('[data-test-id="board-card-section-title-link"]');
      const title = titleEl ? titleEl.textContent.toLowerCase() : '';
      
      // Parse property labels to find owner, category, and last activity date
      const propertyLabels = container.querySelectorAll('[data-test-id="cdbc-property-label"]');
      let hasOwner = false;
      let category = '';
      let lastActivityDate = null;
      
      propertyLabels.forEach(label => {
        const labelText = label.textContent.toLowerCase();
        const valueEl = label.parentElement?.querySelector('[data-test-id="cdbc-property-value"]');
        const value = valueEl ? valueEl.textContent.trim() : '';
        
        // Check for ticket owner
        if (labelText.includes('ticket owner') || labelText.includes('eier') || labelText.includes('owner')) {
          hasOwner = true;
        }
        
        // Check for category
        if (labelText.includes('category') || labelText.includes('kategori')) {
          category = value.toLowerCase();
        }
        
        // Check for last activity date (format: 2026-01-14)
        if (labelText.includes('last activity') || labelText.includes('siste aktivitet')) {
          lastActivityDate = value;
        }
      });
      
      // Calculate days since last activity
      let daysSinceActivity = 0;
      if (lastActivityDate) {
        const days = getDaysSinceDate(lastActivityDate);
        if (days !== null) {
          daysSinceActivity = days;
        }
      }
      
      // Check for unassigned - ticket is unassigned if there's no owner property
      const isUnassigned = !hasOwner;
      
      // Apply highlights based on priority
      let highlightType = null;
      
      // 1. Check urgent keywords in title (highest priority - red)
      if (CONFIG.urgentKeywords.some(kw => title.includes(kw.toLowerCase()))) {
        highlightType = 'urgent';
      }
      // 2. Check category highlights
      else if (category && CONFIG.categoryHighlights[category]) {
        highlightType = CONFIG.categoryHighlights[category];
      }
      // 3. Age-based highlighting (green/yellow/purple) based on last activity
      else {
        highlightType = getAgeHighlightType(daysSinceActivity);
      }
      
      // Apply the highlight
      applyCardHighlight(card, highlightType, { daysSinceActivity, isUnassigned, hasOwner, lastActivityDate });
    });
  }

  function applyCardHighlight(card, type, info) {
    // Reset previous highlights
    card.classList.remove(
      'hs-card-urgent', 
      'hs-card-fresh', 
      'hs-card-attention', 
      'hs-card-overdue', 
      'hs-card-unassigned'
    );
    
    if (type) {
      card.classList.add(`hs-card-${type}`);
    }
    
    // Add unassigned class on top of age color if applicable
    if (info.isUnassigned && CONFIG.highlightUnassigned) {
      card.classList.add('hs-card-unassigned');
    }
    
    // Log for debugging
    console.log(`🎨 Highlighted card as ${type}${info.isUnassigned ? ' (unassigned)' : ''}:`, 
      card.querySelector('[data-test-id="board-card-section-title-link"]')?.textContent?.trim(),
      `(${info.daysSinceActivity} days since activity, last: ${info.lastActivityDate || 'unknown'})`
    );
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
      
      // Check for unassigned
      if (CONFIG.highlightUnassigned) {
        const unassignedIndicators = ['unassigned', 'ikke tildelt', '--'];
        if (unassignedIndicators.some(indicator => text.includes(indicator.toLowerCase()))) {
          row.classList.add('hs-row-attention', 'hs-unassigned');
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
    
    console.log('🎨 HubSpot Highlighter loaded on ticket page');
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
