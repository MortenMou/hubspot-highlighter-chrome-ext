# HubSpot Highlighter - Chrome Extension

A Chrome extension to visually highlight tickets in HubSpot based on their age, helping you track response times at a glance.

## Features

- 🟢 **Fresh Tickets** (green): 0-2 days old – good response time
- 🟡 **Needs Attention** (yellow): 3-5 days old – should be addressed soon
- 🟣 **Overdue** (purple): 6+ days old – requires immediate attention
- 🔴 **Urgent Keywords** (red, pulsing): Tickets containing words like "haster", "kritisk", "urgent"
- ⚠️ **Unassigned Indicator**: Dashed border on tickets without an owner
- ⚙️ **Configurable**: Customize thresholds and keywords via the popup

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
- **Urgent Keywords**: Words that trigger red highlighting (highest priority)
- **Fresh ticket days**: Maximum age for green highlighting (default: 2)
- **Attention ticket days**: Maximum age for yellow highlighting (default: 5)
- **Highlight Unassigned**: Add dashed border to tickets without an owner

## Color Priority

1. **Urgent keywords** (red) – always takes priority if keyword is found in title
2. **Age-based colors** – applied to all other tickets:
   - Green → Yellow → Purple as tickets get older
3. **Unassigned** – dashed border layered on top of age color

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

## Author

Created by Morten Mouritzen
