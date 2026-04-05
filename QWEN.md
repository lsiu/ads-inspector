# Ad Auction Inspector - Project Context

## Project Overview

**Ad Auction Inspector** is a Chrome DevTools extension that monitors Prebid.js and Google Tag Manager ad auctions in real-time. It provides developers and ad ops professionals with deep insights into header bidding auctions, displaying bid data directly in Chrome DevTools.

### Core Features

- **Real-time auction monitoring**: Listens to Prebid.js events (auctionInit, bidResponse, bidWon, auctionEnd)
- **Ad slot catalog**: View all ad slots with their sizes and auction history
- **Bidder breakdown**: See all bids with CPM prices and status (winner/loser)
- **Creative preview**: Render the winning ad markup
- **Data persistence**: Auction data saved hourly to user-selected directory in NDJSON format
- **DevTools integration**: Custom panel in Chrome DevTools for easy access

## Architecture

### Directory Structure

```
adsads/
├── src/
│   ├── content/           # Content scripts
│   │   ├── content.tsx    # Content script with Prebid.js listeners
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
│   ├── public/
│   │   └── manifest.json  # Chrome extension manifest
│   ├── App.tsx            # Main React component
│   ├── App.css            # Component styles
│   ├── index.css          # Global styles (Tailwind)
│   └── main.tsx           # React entry point
├── public/                # Static assets
│   └── injected.js        # Injected script (built to dist/)
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

### How It Works

1. **Injected Script** (`injected.ts`): Runs in the page context to access `window.pbjs` (Prebid.js global)
2. **Content Script** (`content.tsx`): Injects into all web pages, communicates with injected script
3. **Background Service Worker**: Receives auction data from content scripts, forwards to DevTools panel
4. **DevTools Panel**: Displays auction data in React-based UI
5. **IndexedDB**: Stores FileSystemHandle for persistent directory access
6. **File System Access API**: Writes auction data hourly to user-selected directory

### Data Flow

```
Page (Prebid.js) → Injected Script → Content Script → Background Worker → DevTools Panel
```

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

Auction data is written hourly in **NDJSON** format (one JSON object per line):

```json
{"pageUrl":"https://example.com","timestamp":1711728000000,"adSlots":[...],"savedAt":1711728000000}
{"pageUrl":"https://example.com","timestamp":1711728060000,"adSlots":[...],"savedAt":1711728060000}
```

**File naming**: `auctions-YYYY-MM-DD-HH.json` (e.g., `auctions-2026-03-29-22.json`)

## Key Implementation Details

### Prebid.js Integration
- Accesses `window.pbjs` global from injected script
- Listens to events: `auctionInit`, `bidResponse`, `bidWon`, `auctionEnd`
- Runs in page context to bypass content script isolation

### Storage Strategy
- **IndexedDB**: Stores FileSystemHandle objects (handles can ONLY be stored in IndexedDB)
- **File System**: Uses File System Access API for writing NDJSON files
- **Persistence**: Directory selection persists across sessions

### Extension Architecture
- **Manifest V3**: Modern extension architecture
- **Service Worker**: Background script handles message passing
- **Content Scripts**: Page injection and event listening
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
