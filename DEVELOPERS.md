# Developer Guide - Ad Auction Inspector

## Architecture Overview

**Ad Auction Inspector** is a Chrome DevTools extension (Manifest V3) that monitors Prebid.js and Google Tag Manager ad auctions. It uses an event-driven architecture with four main layers:

1. **Injected Script** - Runs in page context to access `window.pbjs` (Prebid.js global)
2. **Content Script** - Bridges injected script ↔ background worker
3. **Background Service Worker** - Accumulates state per tab, broadcasts snapshots to DevTools, writes NDJSON files
4. **DevTools Panel** - React-based UI displaying auction data

### Data Flow

```
Page (Prebid.js / GPT)
  → Injected Script (src/content/injected.ts)
  → Content Script (src/content/content.tsx)
  → Background Worker (src/background/background.ts)
    ├─ Accumulate state per tab
    ├─ Broadcast snapshot to DevTools Panel
    └─ Write individual events to NDJSON files
```

## Directory Structure

```
ad-auction-inspector/
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
│   │   │   └── AuctionsList.tsx
│   │   ├── Panel.tsx
│   │   ├── devtools.ts
│   │   └── panel.tsx
│   ├── options/           # Options page for settings
│   │   └── options.tsx
│   ├── public/
│   │   └── manifest.json  # Chrome extension manifest
│   ├── shared/            # Shared types and utilities
│   │   ├── types.ts       # All message types and data interfaces
│   │   └── idb.ts         # Shared IndexedDB helpers
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

## How It Works

### Event Streaming Model

The extension uses an **event streaming** model:

1. **Injected script** forwards each Prebid.js/GPT event as-is (no accumulation)
2. **Background worker** accumulates state per tab and broadcasts snapshots to panels
3. **NDJSON file** contains one line per event (true event stream, not hourly snapshots)

**Event types**: `AUCTION_INIT`, `BID_REQUESTED`, `BID_RESPONSE`, `BID_WON`, `AUCTION_END`, `GTM_EVENT`, `GPT_RENDER_ENDED`

### Why State Accumulates in Background

The background service worker accumulates auction state (not just forwarding raw events) so that:

- When a user opens DevTools **after** auctions have already run, the panel receives the full accumulated snapshot on connect
- Without this, any events before the panel opened would be lost to the UI
- The service worker lifetime is typically tied to the browsing session, so state persists for the duration of active use

### GPT Correlation

When `slotRenderEnded` fires, the background worker:
- Matches the GPT slot to an existing ad slot by `adUnitPath`
- Stores GPT metadata (`creativeId`, `lineItemId`, `advertiserId`, `campaignId`, `isBackfill`, etc.)
- If Prebid bids exist but no `winningBid`, creates a synthetic winning bid labeled "Google Ad Manager (Direct)" or "(Backfill)"

### Storage Strategy

- **IndexedDB**: Stores FileSystemHandle objects (handles can ONLY be stored in IndexedDB)
- **File System**: Uses File System Access API for writing NDJSON files
- **Persistence**: Directory selection persists across sessions
- **Event streaming**: Each event written immediately as a single NDJSON line

## Build Configuration

### Vite Entry Points

All extension entry points are configured in `vite.config.ts`:

```typescript
rollupOptions: {
  input: {
    // All entry points listed here
  }
}
```

If you add a new HTML page or script, add it to the input config.

### Content Scripts

- `src/content/injected.ts` - Runs in page context, has access to `window.pbjs`
- `src/content/content.tsx` - Runs in content script context, bridges page ↔ background

## Shared Types

All message types and data interfaces live in `src/shared/types.ts` and are imported by every module:

- **Message types** (by communication channel): `ContentToBackgroundMessage`, `OptionsToBackgroundMessage`, `PanelToBackgroundMessage`, `BackgroundToPanelMessage`
- **Auction event types**: `AuctionEventType` union, `AuctionEventMessage`
- **Data interfaces**: `Bid`, `GptInfo`, `AdSlot`, `AdAuctionData`, `NDJSONEvent`

This eliminates duplicated type definitions and ensures type safety across all communication boundaries.

### When Adding New Types

1. **Check if shared**: Will this type be used by multiple components (background, devtools, content, options)?
   - ✅ Yes → Add to `src/shared/types.ts`
   - ❌ No → Keep in the component's own directory

2. **Examples of shared types**:
   - Message types for inter-component communication
   - Data structures passed between components (Bid, AdSlot, AuctionEvent, etc.)
   - Enums used across components (AuctionEventType, etc.)

3. **Examples of local types**:
   - Component-specific props (React component props)
   - Internal state types used only within one file
   - UI-specific types (theme configs, component state)

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

- **`vite.config.ts`**: Uses CRXJS Vite plugin, multiple entry points, sourcemaps enabled by default
- **`tailwind.config.js`**: Tailwind CSS 4 configuration, integrated with PostCSS
- **`tsconfig.app.json`**: TypeScript configuration for app code, React JSX support
- **`eslint.config.js`**: Flat config format (ESLint 9), TypeScript and React rules

## Data Format

Auction data is written as **NDJSON** (one JSON object per line), one event per line:

```json
{"pageUrl":"https://example.com","timestamp":1711728000000,"type":"BID_RESPONSE","data":{"auctionId":"...","adUnitCode":"/1234/slot","bid":{...},"sizes":[[300,250]]},"savedAt":1711728000000}
{"pageUrl":"https://example.com","timestamp":1711728000100,"type":"GPT_RENDER_ENDED","data":{"adUnitPath":"/1234/slot","creativeId":12345,"lineItemId":67890,"isEmpty":false,...},"savedAt":1711728000100}
```

**File naming**: `auctions-YYYY-MM-DD-HH.json` (e.g., `auctions-2026-03-29-22.json`)

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/shared/types.ts` | All shared types and message interfaces |
| `src/background/background.ts` | Service worker, state management, message routing |
| `src/background/storage.ts` | File system storage (NDJSON writes) |
| `src/background/idb.ts` | IndexedDB utilities for handle persistence |
| `src/content/injected.ts` | Injected into page context (accesses Prebid.js) |
| `src/content/content.tsx` | Content script (bridges injected ↔ background) |
| `src/devtools/Panel.tsx` | Main DevTools panel component |
| `src/devtools/devtools.ts` | DevTools extension registration |
| `src/devtools/components/AuctionsList.tsx` | Auction list component |
| `src/options/options.tsx` | Settings/options page |
| `src/public/manifest.json` | Chrome extension manifest |

## Known Issues

- **Vite 8 + React 19**: Compatibility issue requires sourcemaps to be enabled by default
- Build output is optimized specifically for Chrome extensions

## See Also

- [README.md](./README.md) - User-facing documentation, quick start, and basic usage
- [AGENTS.md](./AGENTS.md) - AI agent coding instructions and guidelines
