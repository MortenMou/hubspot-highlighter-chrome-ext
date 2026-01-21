# HubSpot Highlighter - Chrome Extension

A Chrome extension to visually highlight important items in HubSpot for the CS team.

## Features

- 🔴 **Urgent Highlighting**: Red border/glow for tickets containing urgent keywords
- 🟡 **Warning Highlighting**: Yellow border for important items
- 🟢 **Status-based Colors**: Different colors for different ticket statuses
- ⚠️ **Unassigned Indicators**: Visual marker for unassigned tickets
- 📅 **Aged Ticket Detection**: Striped background for old tickets
- ⚙️ **Configurable**: Easy popup to customize keywords and settings

## Installation

### For Chrome / Arc / Edge / Brave

1. Clone or download this repository
2. Open your browser and go to `chrome://extensions/` (or `arc://extensions/` for Arc)
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select this folder
6. The extension icon should appear in your toolbar

## Configuration

Click the extension icon to open the settings popup where you can:

- **Enable/Disable** the highlighter
- **Urgent Keywords**: Words that trigger red highlighting (e.g., "urgent", "haster", "kritisk")
- **Warning Keywords**: Words that trigger yellow highlighting (e.g., "important", "viktig")
- **Aged Tickets Days**: How old (in days) before tickets get a striped warning background
- **Highlight Unassigned**: Toggle to mark unassigned tickets

## Files

```
├── manifest.json      # Extension configuration
├── content.js         # Main highlighting logic
├── styles.css         # Visual styles
├── popup.html         # Settings popup UI
├── popup.js           # Settings logic
└── icons/             # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```
