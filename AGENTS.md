# AI Agent Coding Instructions

## Overview

This file contains instructions for AI agents working on the Ad Auction Inspector codebase. For full architecture and coding standards, see [DEVELOPERS.md](./DEVELOPERS.md). For user-facing documentation, see [README.md](./README.md).

## Code Organization

### Main Component Structure

Main components are organized in separate folders under `src/`:

* **`src/background/`** - Background service worker code (message routing, state accumulation, file writes)
* **`src/devtools/`** - Frontend code for the DevTools panel (React components, UI logic)
* **`src/content/`** - Code injected into the content page to manipulate or get information from web pages
* **`src/options/`** - Options page for the app configuration

### Shared Code

* **`src/shared/`** - Classes, interfaces, and types that are shared between components
  - `types.ts` - All message types, data interfaces, and shared type definitions
  - `idb.ts` - Shared IndexedDB utilities

### Self-Contained Code

Types and utilities that are **not shared** should stay in their respective component directories. Do not move everything to `src/shared/` - only place code there if multiple components need to import it.

## Communication Patterns

### Message Types

All inter-component communication uses typed messages defined in `src/shared/types.ts`:

- `ContentToBackgroundMessage` - Content script → Background worker
- `OptionsToBackgroundMessage` - Options page → Background worker
- `PanelToBackgroundMessage` - DevTools panel → Background worker
- `BackgroundToPanelMessage` - Background worker → DevTools panel

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

## Development Guidelines

### When Adding New Types/Interfaces

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

### When Adding New Components

1. **Identify the layer**: Where does this code run?
   - Background service worker → `src/background/`
   - DevTools panel UI → `src/devtools/`
   - Page context injection → `src/content/`
   - Extension options page → `src/options/`

2. **Create the file** in the appropriate directory

3. **Update `vite.config.ts`** if you need a new entry point

### When Adding New Features

1. **Identify which components need changes** based on the data flow
2. **Update shared types first** in `src/shared/types.ts`
3. **Implement component-specific code** in respective directories
4. **Test the full data flow** from injection to UI display

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

## Best Practices

### Type Safety
- Use TypeScript strict mode
- Import shared types from `src/shared/types.ts`
- Avoid `any` - use proper type definitions
- Leverage discriminated unions for message types

### Code Style
- Follow existing patterns in the codebase
- Use React 19 conventions (functional components, hooks)
- Keep components focused and single-responsibility
- Add comments for complex logic, not obvious operations

### Message Handling
- Always type messages using the shared message types
- Use discriminated unions with `type` field for message routing
- Handle all message types in switch statements (exhaustiveness checking)

### State Management
- Background worker accumulates state per tab (not per connection)
- DevTools panel receives snapshots, not individual events
- IndexedDB only for FileSystemHandle persistence
- File system for NDJSON event storage

## Common Tasks

### Adding a New Message Type
1. Define the message interface in `src/shared/types.ts`
2. Add to the appropriate union type (e.g., `ContentToBackgroundMessage`)
3. Handle in the receiving component's message handler
4. Update any related UI components if needed

### Debugging Data Flow
1. Check injected script fires events (`injected.ts`)
2. Check content script forwards them (`content.tsx`)
3. Check background worker receives and processes (`background.ts`)
4. Check DevTools panel receives snapshot (`Panel.tsx`)
5. Check NDJSON file is written (`storage.ts`)

## Important Notes

- **Event-Driven Architecture**: Events are forwarded immediately, not batched
- **State Accumulation**: Background worker maintains per-tab auction state
- **NDJSON Format**: One JSON object per line, one event per line
- **File Naming**: `auctions-YYYY-MM-DD-HH.json`
- **Manifest V3**: Modern Chrome extension architecture
- **No Separate Build Script**: `npm run build` handles everything via Vite

## See Also

- [README.md](./README.md) - User-facing documentation, quick start, and basic usage
- [DEVELOPERS.md](./DEVELOPERS.md) - Full architecture, coding standards, and technical details
