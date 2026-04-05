// Background service worker - handles message routing, state accumulation, and data persistence

import { initStorage, isDirectoryConfigured, writeAuctionData, getDirectoryName, clearDirectoryConfig } from './storage';

interface Bid {
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
}

interface AdSlot {
  slotCode: string;
  divId: string;
  sizes: number[][];
  bids: Bid[];
  winningBid?: Bid;
}

interface AdAuctionData {
  pageUrl: string;
  timestamp: number;
  adSlots: AdSlot[];
}

// NDJSON event types that flow through the system
type EventType =
  | 'AUCTION_INIT'
  | 'BID_REQUESTED'
  | 'BID_RESPONSE'
  | 'BID_WON'
  | 'AUCTION_END'
  | 'GTM_EVENT'
  | 'GPT_RENDER_ENDED';

interface AuctionEventMessage {
  pageUrl: string;
  timestamp: number;
  type: EventType;
  data: Record<string, unknown>;
}

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

function getOrCreateSlot(tabId: number, adUnitCode: string, sizes: number[][] = []): AdSlot {
  const data = tabData.get(tabId);
  if (!data) return { slotCode: adUnitCode, divId: '', sizes, bids: [] };

  let slot = data.adSlots.find((s) => s.slotCode === adUnitCode);
  if (!slot) {
    slot = { slotCode: adUnitCode, divId: '', sizes, bids: [] };
    data.adSlots.push(slot);
  }
  // Update sizes if we got better info
  if (sizes.length > 0 && (!slot.sizes || slot.sizes.length === 0)) {
    slot.sizes = sizes;
  }
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
      // Avoid duplicate bids (by bidId)
      if (!slot.bids.some((b) => b.bidId === bid.bidId)) {
        slot.bids.push(bid);
      }
      break;
    }
    case 'BID_WON': {
      const { adUnitCode, winningBid } = message.data as { adUnitCode: string; winningBid: Bid };
      const slot = getOrCreateSlot(tabId, adUnitCode);
      slot.winningBid = winningBid;
      break;
    }
    case 'AUCTION_INIT':
    case 'BID_REQUESTED':
    case 'AUCTION_END':
    case 'GTM_EVENT':
    case 'GPT_RENDER_ENDED':
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
  const eventTypes: EventType[] = [
    'AUCTION_INIT', 'BID_REQUESTED', 'BID_RESPONSE', 'BID_WON',
    'AUCTION_END', 'GTM_EVENT', 'GPT_RENDER_ENDED',
  ];

  if (eventTypes.includes(message.type as EventType)) {
    const tabId = sender.tab?.id;

    if (tabId !== undefined) {
      const eventMessage: AuctionEventMessage = {
        pageUrl: message.payload.pageUrl,
        timestamp: message.payload.timestamp,
        type: message.type as EventType,
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
