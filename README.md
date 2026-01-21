# HubSpot Highlighter - Chrome Extension

A Chrome extension to visually highlight tickets in HubSpot based on their age, helping you track response times at a glance.

## Features

- 🟢 **Fresh Tickets** (green): 0-2 days old – good response time
- 🟡 **Needs Attention** (yellow): 3-5 days old – should be addressed soon
- 🟣 **Overdue** (purple): 6+ days old – requires immediate attention
- 🔴 **Urgent Keywords** (red, pulsing): Tickets containing words like "haster", "kritisk", "urgent"
- ⚠️ **Unassigned Indicator**: Dashed border on tickets without an owner
- ⚙️ **Configurable**: Customize thresholds and keywords via the popup

## Supported Views

### ✅ Board View
Highlights ticket cards with colored borders and backgrounds based on the "Last Activity" property.

### ✅ Table View (NEW!)
Highlights table rows based on the date column (Create Date, Last Activity, etc.). Supports multiple date formats:
- "Today at 15:09 GMT+1"
- "Yesterday at 14:27 GMT+1"  
- "19. jan. 2026 16:18 GMT+1" (European)
- "Jan 19, 2026" (US)
- ISO format (2026-01-19)

**Multi-language support**: Norwegian, Swedish, English, German, Spanish, French date formats.

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

## How It Works

The extension:
1. Detects if you're on a HubSpot ticket page (board view or table view)
2. Finds date columns/properties automatically by looking for headers like "Create Date", "Last Activity", etc.
3. Parses dates in multiple formats and locales
4. Calculates days since the date
5. Applies color-coded highlighting based on your thresholds

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

## Troubleshooting

**Table view not highlighting?**
- Make sure a date column is visible (Create Date or Last Activity)
- Check the browser console (F12) for debug messages starting with 🎨
- The extension identifies columns by their header text

**Colors not showing?**
- Refresh the page after installing/updating the extension
- Check that the extension is enabled in chrome://extensions/

## Author

Created by Morten Mouritzen
