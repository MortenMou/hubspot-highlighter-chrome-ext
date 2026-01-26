// HubSpot Ticket Helper - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const elements = {
    enabled: document.getElementById('enabled'),
    highlightUnassigned: document.getElementById('highlightUnassigned'),
    showIndicator: document.getElementById('showIndicator'),
    enableLightbox: document.getElementById('enableLightbox'),
    urgentKeywords: document.getElementById('urgentKeywords'),
    freshTicketDays: document.getElementById('freshTicketDays'),
    warningTicketDays: document.getElementById('warningTicketDays'),
    saveBtn: document.getElementById('saveBtn')
  };

  // Default configuration
  const defaultConfig = {
    enabled: true,
    showIndicator: false,
    highlightUnassigned: true,
    enableLightbox: true,
    urgentKeywords: ['urgent', 'haster', 'kritisk', 'critical', 'asap'],
    freshTicketDays: 2,
    warningTicketDays: 5
  };

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(['highlighterConfig'], (result) => {
      const config = result.highlighterConfig || defaultConfig;
      
      elements.enabled.checked = config.enabled;
      elements.highlightUnassigned.checked = config.highlightUnassigned;
      elements.showIndicator.checked = config.showIndicator;
      elements.enableLightbox.checked = config.enableLightbox !== false; // Default to true
      elements.urgentKeywords.value = config.urgentKeywords.join(', ');
      elements.freshTicketDays.value = config.freshTicketDays;
      elements.warningTicketDays.value = config.warningTicketDays;
    });
  }

  // Save settings
  function saveSettings() {
    const config = {
      enabled: elements.enabled.checked,
      highlightUnassigned: elements.highlightUnassigned.checked,
      showIndicator: elements.showIndicator.checked,
      enableLightbox: elements.enableLightbox.checked,
      urgentKeywords: elements.urgentKeywords.value
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0),
      freshTicketDays: parseInt(elements.freshTicketDays.value) || 2,
      warningTicketDays: parseInt(elements.warningTicketDays.value) || 5
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
  ['enabled', 'highlightUnassigned', 'showIndicator', 'enableLightbox'].forEach(id => {
    elements[id].addEventListener('change', saveSettings);
  });

  // Load settings on popup open
  loadSettings();
});
