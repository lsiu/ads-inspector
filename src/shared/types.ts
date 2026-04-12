// Shared message types and data interfaces
// Used across injected.ts, content.tsx, background.ts, Panel.tsx, and storage.ts

// ──────────────────────────────────────────────
// Auction event types (injected → content → background)
// ──────────────────────────────────────────────

export type AuctionEventType =
  | 'AUCTION_INIT'
  | 'BID_REQUESTED'
  | 'BID_RESPONSE'
  | 'BID_WON'
  | 'AUCTION_END'
  | 'GTM_EVENT'
  | 'GPT_RENDER_ENDED';

export interface AuctionEventPayload {
  pageUrl: string;
  timestamp: number;
}

export interface AuctionEventMessage {
  pageUrl: string;
  timestamp: number;
  type: AuctionEventType;
  data: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Content script → background (sendMessage)
// ──────────────────────────────────────────────

export interface ContentScriptLoadedMessage {
  type: 'CONTENT_SCRIPT_LOADED';
  payload: { url: string };
}

export type ContentToBackgroundMessage =
  | ContentScriptLoadedMessage
  | { type: AuctionEventType; payload: Record<string, unknown> };

// ──────────────────────────────────────────────
// Options page → background (sendMessage)
// ──────────────────────────────────────────────

export type OptionsToBackgroundMessage =
  | { type: 'DIRECTORY_HANDLE_STORED' }
  | { type: 'DIRECTORY_HANDLE_CLEARED' };

// ──────────────────────────────────────────────
// Panel → background (port postMessage)
// ──────────────────────────────────────────────

export type PanelToBackgroundMessage =
  | { type: 'GET_DATA' }
  | { type: 'CLEAR_DATA' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'HIGHLIGHT_SLOT'; payload: { slotCode: string; tabId: number } };

// ──────────────────────────────────────────────
// Background → Panel (port postMessage)
// ──────────────────────────────────────────────

export interface AuctionDataUpdateMessage {
  type: 'AUCTION_DATA_UPDATE';
  payload: { pageUrl: string; timestamp: number; adSlots: AdSlot[] };
}

export interface DirectoryStatusMessage {
  type: 'DIRECTORY_STATUS';
  isConfigured: boolean;
  directoryName: string | null;
}

export interface DirectoryNotConfiguredMessage {
  type: 'DIRECTORY_NOT_CONFIGURED';
}

export type BackgroundToPanelMessage =
  | AuctionDataUpdateMessage
  | DirectoryStatusMessage
  | DirectoryNotConfiguredMessage;

// ──────────────────────────────────────────────
// Shared data interfaces
// ──────────────────────────────────────────────

export interface Bid {
  bidder: string;
  bidId: string;
  cpm: number;
  currency: string;
  width: number;
  height: number;
  ad: string;
  creativeId?: string;
  auctionId: string;
  adUnitCode: string;
  adomain?: string;
}

export interface GptInfo {
  creativeId: number | null;
  sourceAgnosticCreativeId: number | null;
  lineItemId: number | null;
  sourceAgnosticLineItemId: number | null;
  advertiserId: number | null;
  campaignId: number | null;
  isEmpty: boolean;
  isBackfill: boolean;
  size: number[] | string | null;
  divId: string;
  adUnitPath: string;
}

export interface AdSlot {
  slotCode: string;
  auctionId: string;
  timestamp: number;
  divId: string;
  sizes: number[][];
  bids: Bid[];
  winningBid?: Bid;
  gpt?: GptInfo;
  mediaTypes?: object;
}

export interface AdAuctionData {
  pageUrl: string;
  timestamp: number;
  adSlots: AdSlot[];
}

/** A unique ID for an AdSlot. An AdSlot can be auctioned off multiple times */
export function getAdSlotId(slot: AdSlot): string | undefined {
  if (!slot) return undefined;
  return `${slot.slotCode || 'unknown'}-${slot.auctionId || 'unknown'}`;
}
