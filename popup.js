// HubSpot Highlighter - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    enabled: document.getElementById('enabled'),
    highlightUnassigned: document.getElementById('highlightUnassigned'),
    showIndicator: document.getElementById('showIndicator'),
    urgentKeywords: document.getElementById('urgentKeywords'),
    warningKeywords: document.getElementById('warningKeywords'),
    agedTicketDays: document.getElementById('agedTicketDays'),
    saveBtn: document.getElementById('saveBtn')
  };

  // Default configuration
  const defaultConfig = {
    enabled: true,
    showIndicator: false,
    highlightUnassigned: true,
    urgentKeywords: ['urgent', 'haster', 'kritisk', 'critical', 'asap'],
    warningKeywords: ['important', 'viktig', 'snart', 'soon'],
    agedTicketDays: 7
  };

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(['highlighterConfig'], (result) => {
      const config = result.highlighterConfig || defaultConfig;
      
      elements.enabled.checked = config.enabled;
      elements.highlightUnassigned.checked = config.highlightUnassigned;
      elements.showIndicator.checked = config.showIndicator;
      elements.urgentKeywords.value = config.urgentKeywords.join(', ');
      elements.warningKeywords.value = config.warningKeywords.join(', ');
      elements.agedTicketDays.value = config.agedTicketDays;
    });
  }

  // Save settings
  function saveSettings() {
    const config = {
      enabled: elements.enabled.checked,
      highlightUnassigned: elements.highlightUnassigned.checked,
      showIndicator: elements.showIndicator.checked,
      urgentKeywords: elements.urgentKeywords.value
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0),
      warningKeywords: elements.warningKeywords.value
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0),
      agedTicketDays: parseInt(elements.agedTicketDays.value) || 7
    };

    chrome.storage.sync.set({ highlighterConfig: config }, () => {
      // Visual feedback
      elements.saveBtn.textContent = '✓ Saved!';
      elements.saveBtn.classList.add('saved');
      
      setTimeout(() => {
        elements.saveBtn.textContent = 'Save Settings';
        elements.saveBtn.classList.remove('saved');
      }, 2000);

      // Notify content script to refresh
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'refresh' }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      });
    });
  }

  // Event listeners
  elements.saveBtn.addEventListener('click', saveSettings);

  // Auto-save on toggle changes
  ['enabled', 'highlightUnassigned', 'showIndicator'].forEach(id => {
    elements[id].addEventListener('change', saveSettings);
  });

  // Load settings on popup open
  loadSettings();
});
