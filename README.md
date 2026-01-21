# HubSpot Highlighter - Chrome Extension

A Chrome extension to visually highlight important items in HubSpot for the  CS team.

## Features

- 🔴 **Urgent Highlighting**: Red border/glow for tickets containing urgent keywords
- 🟡 **Warning Highlighting**: Yellow border for important items
- 🟢 **Status-based Colors**: Different colors for different ticket statuses
- ⚠️ **Unassigned Indicators**: Visual marker for unassigned tickets
- 📅 **Aged Ticket Detection**: Striped background for old tickets
- ⚙️ **Configurable**: Easy popup to customize keywords and settings

## Installation

### For Chrome / Arc / Edge / Brave

1. Unzip the extension folder
2. Open your browser and go to `chrome://extensions/` (or `arc://extensions/` for Arc)
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `hubspot-highlighter` folder
6. The extension icon should appear in your toolbar

## Configuration

Click the extension icon to open the settings popup where you can:

- **Enable/Disable** the highlighter
- **Urgent Keywords**: Words that trigger red highlighting (e.g., "urgent", "haster", "kritisk")
- **Warning Keywords**: Words that trigger yellow highlighting (e.g., "important", "viktig")
- **Aged Tickets Days**: How old (in days) before tickets get a striped warning background
- **Highlight Unassigned**: Toggle to mark unassigned tickets

## Customization

### Adding Custom Keywords

Edit the keywords in the popup, or modify `content.js` directly:

```javascript
const CONFIG = {
  urgentKeywords: ['urgent', 'haster', 'kritisk', 'critical', 'asap'],
  warningKeywords: ['important', 'viktig', 'snart', 'soon'],
  // ...
};
```

### Adding Status-based Highlighting

In `content.js`, edit the `statusHighlights` object:

```javascript
statusHighlights: {
  'waiting on contact': 'hs-row-warning',
  'open': 'hs-row-info',
  'closed': 'hs-row-success',
  // Add more statuses here
}
```

### Customizing Colors

Edit `styles.css` to change the highlight colors:

```css
:root {
  --hs-highlight-urgent: #ff4757;
  --hs-highlight-warning: #ffa502;
  --hs-highlight-success: #2ed573;
  --hs-highlight-info: #3742fa;
}
```

## How It Works

The extension injects CSS and JavaScript into HubSpot pages that:

1. Scans table rows and ticket cards for keywords
2. Applies CSS classes based on matches
3. Uses a MutationObserver to handle dynamic content loading
4. Stores settings in Chrome's sync storage (shared across devices)

## Sharing with the Team

To share with colleagues:

1. Zip the `hubspot-highlighter` folder
2. Send the zip file to team members
3. They follow the same installation steps above

Or, if you want to publish it:

1. Create a Chrome Web Store developer account
2. Package the extension as a `.crx` file
3. Upload to the Chrome Web Store (private or unlisted for team use)

## Troubleshooting

**Highlights not appearing?**
- Refresh the HubSpot page after installing
- Check that the extension is enabled in `chrome://extensions/`
- Open DevTools (F12) and check for errors in the Console

**Want different highlight styles?**
- Edit `styles.css` to customize the visual appearance
- The extension uses CSS classes that can be fully customized

## Files

```
hubspot-highlighter/
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

# hubspot-highlighter-chrome-ext
