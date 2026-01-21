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
    
    // Enable table view highlighting
    enableTableHighlighting: true,
    
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
    'januar': 0, 'februari': 1, 'mars': 2, 'mai': 4,
    'juni': 5, 'juli': 6, 'augusti': 7,
    'oktober': 9, 'desember': 11,
    // German
    'märz': 2, 'mär': 2,
    'dezember': 11, 'dez': 11,
    // Spanish
    'enero': 0, 'ene': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'abr': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7, 'ago': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11, 'dic': 11,
    // French
    'janvier': 0, 'janv': 0, 'février': 1, 'févr': 1, 'fév': 1,
    'avril': 3, 'avr': 3,
    'juillet': 6, 'juil': 6, 'août': 7, 'aoû': 7,
    'octobre': 9, 'décembre': 11, 'déc': 11
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
    
    // Pattern 1: DD.MM.YYYY (European with dots, like "21.01.2026")
    const dotMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dotMatch) {
      const day = parseInt(dotMatch[1]);
      const month = parseInt(dotMatch[2]) - 1; // 0-indexed
      const year = parseInt(dotMatch[3]);
      return new Date(year, month, day);
    }
    
    // Pattern 2: ISO format (2026-01-19)
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    }
    
    // Pattern 3: "19. jan. 2026" or "19 jan 2026" (European with month name)
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
    
    // Pattern 4: "Jan 19, 2026" or "January 19, 2026" (US)
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
    
    // Highlight table rows (list view) - only if enabled
    if (CONFIG.enableTableHighlighting) {
      highlightTableRows();
    }
    
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
      
      // Get ALL text content from the card to search for dates and properties
      const cardText = container.textContent || '';
      
      // Look for "Last activity date: DD.MM.YYYY" pattern in card text
      let lastActivityDate = null;
      const lastActivityMatch = cardText.match(/last activity date[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})/i) ||
                                cardText.match(/siste aktivitet[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})/i);
      if (lastActivityMatch) {
        lastActivityDate = lastActivityMatch[1];
      }
      
      // Also check property labels (original method as fallback)
      const propertyLabels = container.querySelectorAll('[data-test-id="cdbc-property-label"]');
      let hasOwner = false;
      let category = '';
      
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
        
        // Check for last activity date in property labels
        if (!lastActivityDate && (labelText.includes('last activity') || labelText.includes('siste aktivitet'))) {
          lastActivityDate = value;
        }
      });
      
      // Also check for owner in card text
      if (!hasOwner && (cardText.toLowerCase().includes('ticket owner:') || cardText.toLowerCase().includes('eier:'))) {
        hasOwner = true;
      }
      
      // Calculate days since last activity
      let daysSinceActivity = null;
      if (lastActivityDate) {
        daysSinceActivity = getDaysSinceDate(lastActivityDate);
        console.log(`🎨 Card date parsing: "${lastActivityDate}" → ${daysSinceActivity} days`);
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
      else if (daysSinceActivity !== null) {
        highlightType = getAgeHighlightType(daysSinceActivity);
      }
      // 4. Default to null (no color) if we couldn't parse a date
      else {
        highlightType = null;
        console.log(`🎨 No date found for card: "${title.substring(0, 30)}..."`);
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
    console.log(`🎨 Highlighted card as ${type || 'none'}${info.isUnassigned ? ' (unassigned)' : ''}:`, 
      card.querySelector('[data-test-id="board-card-section-title-link"]')?.textContent?.trim().substring(0, 40),
      `(${info.daysSinceActivity !== null ? info.daysSinceActivity + ' days' : 'no date'}, last: ${info.lastActivityDate || 'unknown'})`
    );
  }

  // ============================================
  // TABLE VIEW HIGHLIGHTING
  // ============================================

  function highlightTableRows() {
    // Find the main data table - look for the largest table on the page
    const tables = document.querySelectorAll('table');
    let mainTable = null;
    let maxRows = 0;
    
    tables.forEach(table => {
      // Skip tables inside other tables (nested)
      if (table.closest('table') !== table.parentElement?.closest('table') && table.parentElement?.closest('table')) {
        return;
      }
      
      const rowCount = table.querySelectorAll('tbody > tr').length;
      if (rowCount > maxRows) {
        maxRows = rowCount;
        mainTable = table;
      }
    });
    
    if (!mainTable || maxRows < 2) {
      return;
    }
    
    // Find header row to identify columns
    const headerRow = mainTable.querySelector('thead > tr');
    if (!headerRow) return;
    
    const headers = headerRow.querySelectorAll('th');
    let dateColIndex = -1;
    let ownerColIndex = -1;
    
    // Find column indices by header text
    headers.forEach((header, index) => {
      const text = header.textContent.toLowerCase().trim();
      
      // Date columns - prioritize "create date" 
      if (text.includes('create date') || text.includes('opprettet')) {
        dateColIndex = index;
        console.log(`🎨 Table: Found CREATE DATE column at index ${index}`);
      } else if (dateColIndex === -1 && (text.includes('last activity') || text.includes('siste aktivitet') || text.includes('date'))) {
        dateColIndex = index;
        console.log(`🎨 Table: Found date column "${text}" at index ${index}`);
      }
      
      // Owner columns
      if (text.includes('owner') || text.includes('eier')) {
        ownerColIndex = index;
      }
    });
    
    // Get ONLY direct child rows of tbody (not nested rows)
    const rows = mainTable.querySelectorAll('tbody > tr');
    
    console.log(`🎨 Table: Processing ${rows.length} rows, date col: ${dateColIndex}, owner col: ${ownerColIndex}`);
    
    let processedCount = 0;
    
    rows.forEach((row, rowIndex) => {
      // Skip if already highlighted
      if (row.dataset.hsHighlighted === 'true') return;
      
      // Skip rows that don't have the expected number of cells (might be grouping rows)
      const cells = row.querySelectorAll(':scope > td');
      if (cells.length < 3) return; // Need at least a few columns
      
      // Skip rows that contain nested tables
      if (row.querySelector('table')) return;
      
      row.dataset.hsHighlighted = 'true';
      processedCount++;
      
      const rowText = row.textContent.toLowerCase();
      
      // 1. Check for urgent keywords first (highest priority)
      if (CONFIG.urgentKeywords.some(keyword => rowText.includes(keyword.toLowerCase()))) {
        applyRowHighlight(row, 'urgent');
        return;
      }
      
      // 2. Try to parse date from the date column
      if (dateColIndex >= 0 && cells[dateColIndex]) {
        const dateText = cells[dateColIndex].textContent.trim();
        const daysSince = getDaysSinceDate(dateText);
        
        if (daysSince !== null) {
          const highlightType = getAgeHighlightType(daysSince);
          applyRowHighlight(row, highlightType);
          
          if (rowIndex < 3) {
            console.log(`🎨 Row ${rowIndex}: "${dateText}" → ${daysSince} days → ${highlightType}`);
          }
          return;
        }
      }
      
      // 3. Fallback: scan cells for date-like content
      for (let i = 0; i < cells.length; i++) {
        const cellText = cells[i].textContent.trim();
        // Only check cells that look like they might contain dates
        if (cellText.includes('Today') || cellText.includes('Yesterday') || 
            cellText.includes('dag') || cellText.match(/\d{1,2}[.\s].*\d{4}/)) {
          const daysSince = getDaysSinceDate(cellText);
          if (daysSince !== null) {
            const highlightType = getAgeHighlightType(daysSince);
            applyRowHighlight(row, highlightType);
            return;
          }
        }
      }
    });
    
    console.log(`🎨 Table: Highlighted ${processedCount} rows`);
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
        // Reset highlighted flags so elements get re-processed
        document.querySelectorAll('[data-hs-highlighted]').forEach(el => {
          delete el.dataset.hsHighlighted;
        });
        highlightElements();
      }
    });
  }

})();
