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
  // MULTI-LOCALE DATE PARSING
  // ============================================

  // Month names in various languages HubSpot might use
  const MONTH_NAMES = {
    // English
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'sept': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11,
    // Norwegian/Swedish
    'januar': 0, 'februari': 1, 'mars': 2, 'april': 3, 'mai': 4,
    'juni': 5, 'juli': 6, 'augusti': 7, 'september': 8,
    'oktober': 9, 'november': 10, 'desember': 11, 'december': 11,
    // German
    'januar': 0, 'februar': 1, 'märz': 2, 'mär': 2,
    'juni': 5, 'juli': 6, 'august': 7,
    'oktober': 9, 'dezember': 11, 'dez': 11,
    // Spanish
    'enero': 0, 'ene': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'abr': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 'ago': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11, 'dic': 11,
    // French
    'janvier': 0, 'janv': 0, 'février': 1, 'févr': 1, 'fév': 1,
    'mars': 2, 'avril': 3, 'avr': 3, 'mai': 4, 'juin': 5,
    'juillet': 6, 'juil': 6, 'août': 7, 'aoû': 7, 'septembre': 8, 'sept': 8,
    'octobre': 9, 'oct': 9, 'novembre': 10, 'décembre': 11, 'déc': 11
  };

  // "Today" and "Yesterday" in various languages
  const TODAY_WORDS = ['today', 'i dag', 'idag', 'heute', 'hoy', "aujourd'hui", 'vandaag'];
  const YESTERDAY_WORDS = ['yesterday', 'i går', 'igår', 'gestern', 'ayer', 'hier', 'gisteren'];

  function parseHubSpotDate(dateString) {
    if (!dateString || typeof dateString !== 'string') return null;
    
    const text = dateString.toLowerCase().trim();
    const now = new Date();
    
    // Check for "Today at..." patterns
    for (const todayWord of TODAY_WORDS) {
      if (text.includes(todayWord)) {
        return now;
      }
    }
    
    // Check for "Yesterday at..." patterns  
    for (const yesterdayWord of YESTERDAY_WORDS) {
      if (text.includes(yesterdayWord)) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      }
    }
    
    // Try to parse date formats like:
    // "19. jan. 2026 16:18 GMT+1"
    // "Jan 19, 2026"
    // "19 jan 2026"
    // "2026-01-19"
    
    // Pattern 1: ISO format (2026-01-19)
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    
    // Pattern 2: "19. jan. 2026" or "19 jan 2026" (European)
    const euroMatch = text.match(/(\d{1,2})\.?\s*([a-zäöüéè]+)\.?\s*(\d{4})/i);
    if (euroMatch) {
      const day = parseInt(euroMatch[1]);
      const monthStr = euroMatch[2].toLowerCase();
      const year = parseInt(euroMatch[3]);
      const month = MONTH_NAMES[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    
    // Pattern 3: "Jan 19, 2026" or "January 19, 2026" (US)
    const usMatch = text.match(/([a-zäöüéè]+)\.?\s*(\d{1,2}),?\s*(\d{4})/i);
    if (usMatch) {
      const monthStr = usMatch[1].toLowerCase();
      const day = parseInt(usMatch[2]);
      const year = parseInt(usMatch[3]);
      const month = MONTH_NAMES[monthStr];
      if (month !== undefined) {
        return new Date(year, month, day);
      }
    }
    
    // Fallback: try native Date parsing
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return null;
  }

  function getDaysSinceDate(dateOrString) {
    let date;
    
    if (typeof dateOrString === 'string') {
      date = parseHubSpotDate(dateOrString);
    } else if (dateOrString instanceof Date) {
      date = dateOrString;
    } else {
      return null;
    }
    
    if (!date || isNaN(date.getTime())) return null;
    
    const now = new Date();
    // Reset time to midnight for accurate day comparison
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = nowMidnight - dateMidnight;
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

  // ============================================
  // TABLE VIEW HIGHLIGHTING
  // ============================================

  function findDateColumnIndex(headerRow) {
    // Look for date-related column headers
    const dateColumnKeywords = [
      'create date', 'created', 'opprettet', 'erstellt', 'créé',
      'last activity', 'siste aktivitet', 'letzte aktivität', 
      'last modified', 'sist endret', 'modified',
      'date', 'dato', 'datum'
    ];
    
    const cells = headerRow.querySelectorAll('th, td, [role="columnheader"]');
    
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].textContent.toLowerCase().trim();
      for (const keyword of dateColumnKeywords) {
        if (cellText.includes(keyword)) {
          console.log(`🎨 Found date column at index ${i}: "${cellText}"`);
          return i;
        }
      }
    }
    
    return -1; // Not found
  }

  function findOwnerColumnIndex(headerRow) {
    const ownerKeywords = ['owner', 'eier', 'besitzer', 'ticket owner', 'assigned'];
    const cells = headerRow.querySelectorAll('th, td, [role="columnheader"]');
    
    for (let i = 0; i < cells.length; i++) {
      const cellText = cells[i].textContent.toLowerCase().trim();
      for (const keyword of ownerKeywords) {
        if (cellText.includes(keyword)) {
          return i;
        }
      }
    }
    return -1;
  }

  function highlightTableRows() {
    // Find all tables on the page
    const tables = document.querySelectorAll('table');
    
    tables.forEach(table => {
      // Find header row to identify columns
      const headerRow = table.querySelector('thead tr, tr:first-child');
      if (!headerRow) return;
      
      const dateColIndex = findDateColumnIndex(headerRow);
      const ownerColIndex = findOwnerColumnIndex(headerRow);
      
      // Get all body rows
      const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
      
      console.log(`🎨 Processing table with ${rows.length} rows, date column: ${dateColIndex}, owner column: ${ownerColIndex}`);
      
      rows.forEach(row => {
        // Skip if already highlighted or is header row
        if (row.dataset.hsHighlighted || row.querySelector('th')) return;
        row.dataset.hsHighlighted = 'true';
        
        const cells = row.querySelectorAll('td, [role="cell"]');
        const rowText = row.textContent.toLowerCase();
        
        // 1. Check for urgent keywords first (highest priority)
        if (CONFIG.urgentKeywords.some(keyword => rowText.includes(keyword.toLowerCase()))) {
          applyRowHighlight(row, 'urgent');
          return;
        }
        
        // 2. Try to get date and calculate age
        let daysSinceActivity = null;
        
        if (dateColIndex >= 0 && cells[dateColIndex]) {
          const dateText = cells[dateColIndex].textContent.trim();
          daysSinceActivity = getDaysSinceDate(dateText);
          
          if (daysSinceActivity !== null) {
            const highlightType = getAgeHighlightType(daysSinceActivity);
            applyRowHighlight(row, highlightType);
            
            // Check for unassigned
            if (CONFIG.highlightUnassigned && ownerColIndex >= 0 && cells[ownerColIndex]) {
              const ownerText = cells[ownerColIndex].textContent.trim();
              if (ownerText === '--' || ownerText === '' || ownerText.toLowerCase().includes('no owner') || ownerText.toLowerCase().includes('unassigned')) {
                row.classList.add('hs-unassigned');
              }
            }
            
            console.log(`🎨 Table row: ${daysSinceActivity} days old → ${highlightType}`, dateText);
            return;
          }
        }
        
        // 3. Fallback: Check for unassigned indicators if no date parsing worked
        if (CONFIG.highlightUnassigned) {
          const unassignedIndicators = ['unassigned', 'ikke tildelt', 'no owner', '--'];
          if (unassignedIndicators.some(indicator => {
            // Only match '--' if it's in an owner-related context
            if (indicator === '--') {
              return ownerColIndex >= 0 && cells[ownerColIndex]?.textContent.trim() === '--';
            }
            return rowText.includes(indicator.toLowerCase());
          })) {
            row.classList.add('hs-row-attention', 'hs-unassigned');
          }
        }
      });
    });
    
    // Also try HubSpot's custom table structure (data-selenium-test)
    highlightHubSpotCustomTable();
  }

  function highlightHubSpotCustomTable() {
    // HubSpot sometimes uses custom div-based tables
    const customRows = document.querySelectorAll('[data-selenium-test="table-row"], [data-test-id*="table-row"]');
    
    customRows.forEach(row => {
      if (row.dataset.hsHighlighted) return;
      row.dataset.hsHighlighted = 'true';
      
      const rowText = row.textContent.toLowerCase();
      
      // Check for urgent keywords
      if (CONFIG.urgentKeywords.some(keyword => rowText.includes(keyword.toLowerCase()))) {
        applyRowHighlight(row, 'urgent');
        return;
      }
      
      // Try to find date in the row
      const datePatterns = [
        /today at/i,
        /yesterday at/i,
        /i dag/i,
        /i går/i,
        /\d{1,2}[.\s]+[a-z]+[.\s]+\d{4}/i
      ];
      
      // Look for cells that might contain dates
      const cells = row.querySelectorAll('[data-test-id*="cell"], [role="cell"], td, > div');
      
      for (const cell of cells) {
        const cellText = cell.textContent.trim();
        
        for (const pattern of datePatterns) {
          if (pattern.test(cellText)) {
            const days = getDaysSinceDate(cellText);
            if (days !== null) {
              const highlightType = getAgeHighlightType(days);
              applyRowHighlight(row, highlightType);
              console.log(`🎨 Custom table row: ${days} days → ${highlightType}`, cellText);
              return;
            }
          }
        }
      }
    });
  }

  function applyRowHighlight(row, type) {
    // Reset previous highlights
    row.classList.remove(
      'hs-row-urgent',
      'hs-row-fresh', 
      'hs-row-attention', 
      'hs-row-overdue'
    );
    
    if (type) {
      row.classList.add(`hs-row-${type}`);
    }
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
