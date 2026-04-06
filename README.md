# Ad Auction Inspector

A Chrome DevTools extension that monitors Prebid.js and Google Tag Manager ad auctions in real-time and displays them in Chrome DevTools.

## Features

- **Real-time auction monitoring**: Listens to Prebid.js events (auctionInit, bidRequested, bidResponse, bidWon, auctionEnd)
- **Google Publisher Tag (GPT) correlation**: Captures `slotRenderEnded` events to identify winning ads even when GAM serves direct-sold or backfill ads
- **Ad slot catalog**: View all ad slots with their sizes and auction history
- **Bidder breakdown**: See all bids with CPM prices and status (winner/loser)
- **Creative preview**: Render the winning ad markup (Prebid bids only; GPT-only wins show SafeFrame notice)
- **Data persistence**: Individual auction events saved to user-selected directory in NDJSON format
- **DevTools integration**: Custom panel in Chrome DevTools for easy access

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Install and Build

```bash
# Install dependencies
npm install

# Build extension
npm run build
```

### Load Extension in Chrome

1. Run `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `dist` folder

### Development

```bash
# Development mode with hot module replacement
npm run dev

# Lint code
npm run lint
```

## Debugging

### With Sourcemaps

All builds include sourcemaps by default (due to Vite 8 + React 19 compatibility):
- Debug original TypeScript/React source in Chrome DevTools
- Set breakpoints in source files
- See meaningful stack traces

### VS Code Debugging

1. Press `F5` in VS Code to launch Chrome with extension loaded
2. The extension loads from `dist` folder automatically
3. Configuration in `.vscode/launch.json`

### Debugging DevTools Panel

1. Open DevTools on any page
2. Go to the **Ad Inspector** panel
3. Open DevTools for the DevTools panel (three dots → More tools → Developer tools)
4. Set breakpoints in original source code

## Data Format

Auction data is written as **NDJSON** (one JSON object per line):

```json
{"pageUrl":"https://example.com","timestamp":1711728000000,"type":"BID_RESPONSE","data":{"auctionId":"...","adUnitCode":"/1234/slot","bid":{...},"sizes":[[300,250]]},"savedAt":1711728000000}
```

**File naming**: `auctions-YYYYMMDD-HHmmss-<auction_id>.json` (e.g., `auction-20260406-104627-823127e1-7e7.json`)

## Technologies

- **Build**: Vite 8 + CRXJS 2.4.0
- **Framework**: React 19
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4 + PostCSS
- **Extension API**: Chrome Extension Manifest V3
- **Storage**: IndexedDB for FileSystemHandle persistence
- **File System**: File System Access API for data export

## Useful Commands

```bash
npm run dev                  # Start dev server with HMR
npm run build               # Build for production (includes sourcemaps)
npm run lint                # Check code quality
npm run preview             # Preview build
```

## Documentation

- **For Developers**: See [DEVELOPERS.md](./DEVELOPERS.md) for architecture details, coding standards, and contribution guidelines
- **For AI Agents**: See [AGENTS.md](./AGENTS.md) for coding instructions and project structure guidelines

## License

MIT
