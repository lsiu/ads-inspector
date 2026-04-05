# Ad Auction Inspector - Project Context

## Project Overview

**Ad Auction Inspector** is a Chrome DevTools extension that monitors Prebid.js and Google Tag Manager ad auctions in real-time. It provides developers and ad ops professionals with deep insights into header bidding auctions, displaying bid data directly in Chrome DevTools.

### Core Features

- **Real-time auction monitoring**: Listens to Prebid.js events (auctionInit, bidRequested, bidResponse, bidWon, auctionEnd)
- **Google Publisher Tag (GPT) correlation**: Captures `slotRenderEnded` events to identify winning ads even when GAM serves direct-sold or backfill ads instead of Prebid winners
- **Ad slot catalog**: View all ad slots with their sizes and auction history
- **Bidder breakdown**: See all bids with CPM prices and status (winner/loser)
- **Creative preview**: Render the winning ad markup (Prebid bids only; GPT-only wins show SafeFrame notice)
- **Data persistence**: Individual auction events saved to user-selected directory in NDJSON format (one event per line)
- **DevTools integration**: Custom panel in Chrome DevTools for easy access

## Architecture

### Directory Structure

```
adsads/
├── src/
│   ├── content/           # Content scripts
│   │   ├── content.tsx    # Content script (bridges page ↔ background)
│   │   └── injected.ts    # Injected script (runs in page context)
│   ├── background/        # Background service worker
│   │   ├── background.ts  # State accumulation + event routing
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
│   ├── public/
│   │   └── manifest.json  # Chrome extension manifest
│   ├── App.tsx            # Main React component
│   ├── App.css            # Component styles
│   ├── index.css          # Global styles (Tailwind)
│   └── main.tsx           # React entry point
├── .vscode/
│   └── launch.json        # VS Code debug configuration
├── vite.config.ts         # Vite + CRXJS configuration
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.js      # PostCSS configuration
├── eslint.config.js       # ESLint configuration
├── tsconfig.app.json      # TypeScript app config
├── tsconfig.node.json     # TypeScript node config
└── package.json
```

**Note**: The `injected.ts` script is built directly by Vite as an entry point (configured in `vite.config.ts`). Output goes to `dist/injected.js` — no separate `public/` folder or `build-injected.mjs` script is needed.

### How It Works

1. **Injected Script** (`injected.ts`): Runs in the page context to access `window.pbjs` (Prebid.js global)
2. **Content Script** (`content.tsx`): Injects into all web pages, communicates with injected script
3. **Background Service Worker**: Receives auction data from content scripts, forwards to DevTools panel
4. **DevTools Panel**: Displays auction data in React-based UI
5. **IndexedDB**: Stores FileSystemHandle for persistent directory access
6. **File System Access API**: Writes auction data hourly to user-selected directory

### Data Flow

```
Page (Prebid.js / GPT) → Injected Script → Content Script → Background Worker
                                                    ├─ Accumulate state per tab
                                                    ├─ Broadcast snapshot to DevTools Panel
                                                    └─ Write individual event to NDJSON
```

### Event-Driven Architecture

The extension uses an **event streaming** model:

1. **Injected script** forwards each Prebid.js/GPT event as-is (no accumulation)
2. **Background worker** accumulates state per tab and broadcasts snapshots to panels
3. **NDJSON file** contains one line per event (true event stream, not hourly snapshots)

**Event types**: `AUCTION_INIT`, `BID_REQUESTED`, `BID_RESPONSE`, `BID_WON`, `AUCTION_END`, `GTM_EVENT`, `GPT_RENDER_ENDED`

### GPT Correlation

When `slotRenderEnded` fires, the background worker:
- Matches the GPT slot to an existing ad slot by `adUnitPath`
- Stores GPT metadata (`creativeId`, `lineItemId`, `advertiserId`, `campaignId`, `isBackfill`, etc.)
- If Prebid bids exist but no `winningBid`, creates a synthetic winning bid labeled "Google Ad Manager (Direct)" or "(Backfill)"

## Building and Running

### Prerequisites
- Node.js 20+
- npm

### Setup Commands

```bash
# Install dependencies
npm install

# Development mode with HMR
npm run dev

# Production build (includes sourcemaps)
npm run build

# Lint code
npm run lint

# Preview build
npm run preview
```

### Loading the Extension

1. Run `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `dist` folder

### Debugging

#### With Sourcemaps
All builds include sourcemaps by default (due to Vite 8 + React 19 compatibility):
- Debug original TypeScript/React source in Chrome DevTools
- Set breakpoints in source files
- See meaningful stack traces

#### VS Code Debugging
1. Press `F5` in VS Code to launch Chrome with extension loaded
2. The extension loads from `dist` folder automatically
3. Configuration in `.vscode/launch.json`

#### Debugging DevTools Panel
1. Open DevTools on any page
2. Go to the **Ad Inspector** panel
3. Open DevTools for the DevTools panel (three dots → More tools → Developer tools)
4. Set breakpoints in original source code

## Development Conventions

### Code Style
- **Linter**: ESLint 9 with TypeScript-ESLint
- **Plugins**: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- **Formatter**: Not explicitly configured (use Prettier if needed)
- **Type Safety**: TypeScript ~5.9.3 strict mode

### Tech Stack
- **Build**: Vite 8 + CRXJS 2.4.0
- **Framework**: React 19
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4 + PostCSS
- **Extension API**: Chrome Extension Manifest V3
- **Storage**: IndexedDB for FileSystemHandle persistence
- **File System**: File System Access API for data export

### Configuration Files

#### `vite.config.ts`
- Uses CRXJS Vite plugin
- Multiple entry points for extension components
- Sourcemaps enabled by default

#### `tailwind.config.js`
- Tailwind CSS 4 configuration
- Integrated with PostCSS

#### `tsconfig.app.json`
- TypeScript configuration for app code
- React JSX support
- Path aliases if defined

#### `eslint.config.js`
- Flat config format (ESLint 9)
- TypeScript and React rules

## Data Format

Auction data is written as **NDJSON** (one JSON object per line), one event per line:

```json
{"pageUrl":"https://example.com","timestamp":1711728000000,"type":"BID_RESPONSE","data":{"auctionId":"...","adUnitCode":"/1234/slot","bid":{...},"sizes":[[300,250]]},"savedAt":1711728000000}
{"pageUrl":"https://example.com","timestamp":1711728000100,"type":"GPT_RENDER_ENDED","data":{"adUnitPath":"/1234/slot","creativeId":12345,"lineItemId":67890,"isEmpty":false,...},"savedAt":1711728000100}
```

**File naming**: `auctions-YYYY-MM-DD-HH.json` (e.g., `auctions-2026-03-29-22.json`)

## Key Implementation Details

### Prebid.js Integration
- Accesses `window.pbjs` global from injected script
- Listens to events: `auctionInit`, `bidRequested`, `bidResponse`, `bidWon`, `auctionEnd`
- Each event is forwarded immediately — no state accumulation in the injected script
- Runs in page context to bypass content script isolation

### Google Publisher Tag (GPT) Integration
- Uses `@types/googletag` for type safety
- Listens to `googletag.pubads().addEventListener('slotRenderEnded', ...)` 
- Correlates GPT slots with Prebid ad units via `slot.getAdUnitPath()`
- Provides visibility into direct-sold and backfill ads that bypass Prebid

### Storage Strategy
- **IndexedDB**: Stores FileSystemHandle objects (handles can ONLY be stored in IndexedDB)
- **File System**: Uses File System Access API for writing NDJSON files
- **Persistence**: Directory selection persists across sessions
- **Event streaming**: Each event written immediately as a single NDJSON line

### Build Configuration
- `injected.ts` is listed as an entry point in `vite.config.ts` under `rollupOptions.input`
- Output filename set to `injected.js` via `entryFileNames` config
- No separate build script needed — `npm run build` handles everything

### Extension Architecture
- **Manifest V3**: Modern extension architecture
- **Service Worker**: Background script handles message routing, state accumulation, and file writes
- **Content Scripts**: Page injection and event bridging
- **DevTools Panel**: Custom DevTools panel for user interface
- **Options Page**: Configuration for data export directory

## Useful Commands

```bash
# Development
npm run dev                  # Start dev server with HMR

# Production
npm run build               # Build for production

# Quality
npm run lint                # Check code quality

# Debugging
# Press F5 in VS Code       # Launch Chrome with extension
```

## Known Issues

- **Vite 8 + React 19**: Compatibility issue requires sourcemaps to be enabled by default
- Build output is optimized specifically for Chrome extensions
