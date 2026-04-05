// Background service worker - handles message routing, state accumulation, and data persistence

import { initStorage, isDirectoryConfigured, writeAuctionData, getDirectoryName, clearDirectoryConfig } from './storage';
import type {
  AuctionEventType,
  AuctionEventMessage,
  Bid,
  GptInfo,
  AdSlot,
  AdAuctionData,
} from '../shared/types';

// Re-use shared types from types.ts — no local interface definitions needed

// Store accumulated auction state by tab ID
const tabData: Map<number, AdAuctionData> = new Map();

// DevTools panel ports keyed by tab ID
const devToolsPorts: Map<number, chrome.runtime.Port> = new Map();

// Track if directory config has been checked
let directoryCheckRequested = false;

// Initialize storage on startup
initStorage().then(() => {
  console.log('[Ad Inspector] Background service worker initialized');
});

function getOrCreateSlot(tabId: number, adUnitCode: string, sizes: number[][] = []): AdSlot | undefined {
  const data = tabData.get(tabId);
  if (!data) return undefined;

  // Try exact match first
  let slot = data.adSlots.find((s) => s.slotCode === adUnitCode);
  if (slot) {
    if (sizes.length > 0 && (!slot.sizes || slot.sizes.length === 0)) {
      slot.sizes = sizes;
    }
    return slot;
  }

  // Try matching by GPT adUnitPath suffix (e.g., "/1234/ad_unit" → "ad_unit")
  const shortName = adUnitCode.split('/').pop() || adUnitCode;
  slot = data.adSlots.find((s) => s.slotCode === shortName || s.gpt?.adUnitPath === adUnitCode);
  if (slot) {
    if (sizes.length > 0 && (!slot.sizes || slot.sizes.length === 0)) {
      slot.sizes = sizes;
    }
    return slot;
  }

  // Create new slot
  slot = { slotCode: adUnitCode, divId: '', sizes, bids: [] };
  data.adSlots.push(slot);
  return slot;
}

function handleAuctionEvent(tabId: number, message: AuctionEventMessage): void {
  if (!tabData.has(tabId)) {
    tabData.set(tabId, { pageUrl: message.pageUrl, timestamp: message.timestamp, adSlots: [] });
  }
  const data = tabData.get(tabId)!;
  data.pageUrl = message.pageUrl;
  data.timestamp = message.timestamp;

  switch (message.type) {
    case 'BID_RESPONSE': {
      const { adUnitCode, sizes, bid } = message.data as { adUnitCode: string; sizes: number[][]; bid: Bid };
      const slot = getOrCreateSlot(tabId, adUnitCode, sizes);
      if (!slot) return;
      // Avoid duplicate bids (by bidId)
      if (!slot.bids.some((b) => b.bidId === bid.bidId)) {
        slot.bids.push(bid);
      }
      break;
    }
    case 'BID_WON': {
      const { adUnitCode, winningBid } = message.data as { adUnitCode: string; winningBid: Bid };
      const slot = getOrCreateSlot(tabId, adUnitCode);
      if (slot) slot.winningBid = winningBid;
      break;
    }
    case 'GPT_RENDER_ENDED': {
      const d = message.data as Record<string, unknown>;
      const adUnitPath = (d.adUnitPath as string) || '';
      const divId = (d.divId as string) || '';
      const isEmpty = !!d.isEmpty;
      const isBackfill = !!d.isBackfill;
      const creativeId = (d.creativeId as number | null) ?? null;
      const sourceAgnosticCreativeId = (d.sourceAgnosticCreativeId as number | null) ?? null;
      const lineItemId = (d.lineItemId as number | null) ?? null;
      const sourceAgnosticLineItemId = (d.sourceAgnosticLineItemId as number | null) ?? null;
      const advertiserId = (d.advertiserId as number | null) ?? null;
      const campaignId = (d.campaignId as number | null) ?? null;
      const sizeRaw = d.size as number[] | string | null;
      const size = Array.isArray(sizeRaw) ? sizeRaw : null;
      const sizeArr: number[][] = size ? [size] : [];

      // Use divId as the slot key — this matches Prebid's adUnitCode
      const slotKey = divId || adUnitPath.split('/').pop() || adUnitPath;
      const slot = getOrCreateSlot(tabId, slotKey, sizeArr);
      if (!slot) return;

      if (divId) slot.divId = divId;

      const gptInfo: GptInfo = {
        creativeId, sourceAgnosticCreativeId, lineItemId, sourceAgnosticLineItemId,
        advertiserId, campaignId, isEmpty, isBackfill, size, divId, adUnitPath,
      };
      slot.gpt = gptInfo;

      // If slot has Prebid bids but no winningBid, GPT served a direct/backfill ad
      // Create a synthetic winning bid so the UI has something to show
      if (slot.bids.length > 0 && !slot.winningBid && !isEmpty) {
        slot.winningBid = {
          bidder: isBackfill ? 'Google Ad Manager (Backfill)' : 'Google Ad Manager (Direct)',
          bidId: `gpt-${sourceAgnosticCreativeId ?? creativeId ?? 'unknown'}`,
          cpm: 0,
          currency: 'USD',
          width: Array.isArray(size) ? size[0] : 0,
          height: Array.isArray(size) ? size[1] : 0,
          ad: '',
          creativeId: String(sourceAgnosticCreativeId ?? creativeId ?? ''),
          auctionId: slot.bids[0]?.auctionId ?? '',
          adUnitCode: slotKey,
        };
      }
      break;
    }
    case 'AUCTION_INIT':
    case 'BID_REQUESTED':
    case 'AUCTION_END':
    case 'GTM_EVENT':
      // These event types are written to disk but don't change accumulated state
      break;
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Ad Inspector] Background received message:', message.type);

  if (message.type === 'CONTENT_SCRIPT_LOADED') {
    console.log('[Ad Inspector] Content script loaded for:', message.payload.url);
  }

  if (message.type === 'CHECK_DIRECTORY_STATUS') {
    isDirectoryConfigured().then((configured) => {
      getDirectoryName().then((name) => {
        sendResponse({
          isConfigured: configured,
          directoryName: name,
        });
      });
    });
    return true;
  }

  if (message.type === 'DIRECTORY_HANDLE_STORED') {
    console.log('[Ad Inspector] Directory handle stored in IndexedDB');
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'DIRECTORY_HANDLE_CLEARED') {
    clearDirectoryConfig().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  // All event types from injected script
  const eventTypes: AuctionEventType[] = [
    'AUCTION_INIT', 'BID_REQUESTED', 'BID_RESPONSE', 'BID_WON',
    'AUCTION_END', 'GTM_EVENT', 'GPT_RENDER_ENDED',
  ];

  if (eventTypes.includes(message.type as AuctionEventType)) {
    const tabId = sender.tab?.id;

    if (tabId !== undefined) {
      const eventMessage: AuctionEventMessage = {
        pageUrl: message.payload.pageUrl,
        timestamp: message.payload.timestamp,
        type: message.type as AuctionEventType,
        data: message.payload,
      };

      // Accumulate state
      handleAuctionEvent(tabId, eventMessage);

      // Broadcast accumulated state to DevTools panels
      const snapshot = tabData.get(tabId);
      if (snapshot) {
        devToolsPorts.forEach((port) => {
          port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: snapshot });
        });
      }

      // Write the individual event line to NDJSON
      writeAuctionData({
        pageUrl: message.payload.pageUrl,
        timestamp: message.payload.timestamp,
        type: message.type,
        data: message.payload,
      }).then(() => {
        // Check directory status after write
        isDirectoryConfigured().then((configured) => {
          if (!configured && !directoryCheckRequested) {
            directoryCheckRequested = true;
            devToolsPorts.forEach((port) => {
              port.postMessage({ type: 'DIRECTORY_NOT_CONFIGURED' });
            });
          }
        });
      });
    }
  }

  sendResponse({ success: true });
  return true;
});

// Listen for port connections (devtools panel)
chrome.runtime.onConnect.addListener((port) => {
  console.log('[Ad Inspector] onConnect:', port.name);

  if (port.name === 'devtools-panel') {
    const portKey = port.sender?.tab?.id || Date.now();
    devToolsPorts.set(portKey, port);

    // Send directory status
    Promise.all([isDirectoryConfigured(), getDirectoryName()]).then(([configured, name]) => {
      port.postMessage({
        type: 'DIRECTORY_STATUS',
        isConfigured: configured,
        directoryName: name,
      });
    });

    // Send existing accumulated data
    const allData: AdAuctionData = { pageUrl: '', timestamp: Date.now(), adSlots: [] };
    tabData.forEach((data) => {
      allData.adSlots.push(...data.adSlots);
      if (!allData.pageUrl) allData.pageUrl = data.pageUrl;
    });
    port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: allData });

    port.onDisconnect.addListener(() => devToolsPorts.delete(portKey));

    port.onMessage.addListener((message) => {
      console.log('[Ad Inspector] Received from panel:', message);

      if (message.type === 'GET_DATA') {
        const allData: AdAuctionData = { pageUrl: '', timestamp: Date.now(), adSlots: [] };
        tabData.forEach((data) => {
          allData.adSlots.push(...data.adSlots);
          if (!allData.pageUrl) allData.pageUrl = data.pageUrl;
        });
        port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: allData });
      }
      if (message.type === 'CLEAR_DATA') {
        tabData.clear();
        port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: { pageUrl: '', timestamp: Date.now(), adSlots: [] } });
      }
      if (message.type === 'OPEN_OPTIONS') {
        console.log('[Ad Inspector] Opening options page...');
        chrome.tabs.create({
          url: chrome.runtime.getURL('src/options/options.html'),
          active: true,
        }, (tab) => {
          if (chrome.runtime.lastError) {
            console.error('[Ad Inspector] Error opening options:', chrome.runtime.lastError);
          } else {
            console.log('[Ad Inspector] Options page opened in tab:', tab.id);
          }
        });
      }
    });
  }
});

console.log('[Ad Inspector] Background service worker started');
