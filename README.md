# Ad Auction Inspector

A Chrome extension that monitors Prebid.js and Google Tag Manager ad auctions and displays them in Chrome DevTools.

## Features

- **Real-time auction monitoring**: Listens to Prebid.js events (auctionInit, bidResponse, bidWon, auctionEnd)
- **Ad slot catalog**: View all ad slots with their sizes and auction history
- **Bidder breakdown**: See all bids with CPM prices and status (winner/loser)
- **Creative preview**: Render the winning ad markup
- **Data persistence**: Auction data is saved hourly to your selected directory in NDJSON format
- **DevTools integration**: Custom panel in Chrome DevTools for easy access

## Development

### Prerequisites

- Node.js 20+
- npm

### Install Dependencies

```bash
npm install
```

### Build Commands

```bash
# Development build with sourcemaps (for debugging)
npm run build:dev

# Production build (minified, no sourcemaps)
npm run build:prod

# Standard build (uses NODE_ENV to determine settings)
npm run build

# Lint code
npm run lint
```

### Load Extension in Chrome

1. Run `npm run build:dev` (for development with sourcemaps) or `npm run build:prod` (for production)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `dist` folder

### Debugging with Sourcemaps

For development and debugging, use `npm run build:dev` which:
- Generates inline sourcemaps for all files
- Disables minification for readable code
- Allows you to debug original TypeScript/React source in Chrome DevTools

When the extension is loaded, you can:
1. Open DevTools on any page
2. Go to the **Ad Inspector** panel
3. Open DevTools for the DevTools panel (three dots → More tools → Developer tools)
4. Set breakpoints in your original source code

### VS Code Debugging

This project includes a `.vscode/launch.json` configuration for debugging:

1. Press `F5` in VS Code to launch Chrome with the extension loaded
2. The extension will be loaded from the `dist` folder automatically

## Project Structure

```
ad-auction-inspector/
├── src/
│   ├── content/           # Content script (Prebid.js listeners)
│   │   └── content.tsx
│   │   └── injected.ts    # Injected script (runs in page context)
│   ├── background/        # Background service worker
│   │   ├── background.ts
│   │   ├── storage.ts     # File system storage using IndexedDB
│   │   └── idb.ts         # IndexedDB helpers
│   ├── devtools/          # DevTools panel
│   │   ├── components/
│   │   │   ├── AuctionsList.tsx
│   │   │   └── AdSlots.tsx
│   │   ├── Panel.tsx
│   │   └── devtools.ts
│   ├── options/           # Options page for settings
│   │   └── options.tsx
│   ├── shared/            # Shared utilities
│   │   └── idb.ts         # Shared IndexedDB helpers
│   └── public/
│       └── manifest.json  # Chrome extension manifest
├── public/                # Static assets copied to dist
│   └── injected.js        # Injected script (built to dist/)
├── .vscode/
│   └── launch.json        # VS Code debug configuration
├── vite.config.ts         # Vite + CRXJS configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json
```

## How It Works

1. **Content Script**: Injects into all web pages and listens for Prebid.js events
2. **Injected Script**: Runs in the page context to access `window.pbjs` (Prebid.js)
3. **Background Service Worker**: Receives auction data from content scripts and forwards to DevTools panel
4. **DevTools Panel**: Displays auction data in a user-friendly interface
5. **IndexedDB**: Stores the directory handle for file system access (handles can only be stored in IndexedDB)
6. **File System Access API**: Writes auction data to user-selected directory

## Data Format

Auction data is written hourly in NDJSON format (one JSON object per line):

```json
{"pageUrl":"https://example.com","timestamp":1711728000000,"adSlots":[...],"savedAt":1711728000000}
{"pageUrl":"https://example.com","timestamp":1711728060000,"adSlots":[...],"savedAt":1711728060000}
```

Files are named: `auctions-YYYY-MM-DD-HH.json` (e.g., `auctions-2026-03-29-22.json`)

## Technologies

- **Vite** + **CRXJS**: Fast build tooling with Chrome extension support
- **React** 19: UI framework
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **IndexedDB**: Persistent storage for FileSystemHandle objects
- **File System Access API**: Direct file system access for data export

## License

MIT
