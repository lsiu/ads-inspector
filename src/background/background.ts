// Background service worker - handles message routing and data persistence

import { writeAuctionData } from './storage';

interface AdAuctionData {
  pageUrl: string;
  timestamp: number;
  adSlots: AdSlot[];
}

interface AdSlot {
  slotCode: string;
  divId: string;
  sizes: number[][];
  bids: Bid[];
  winningBid?: Bid;
}

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

// Store auction data by tab ID
const tabData: Map<number, AdAuctionData> = new Map();

// DevTools panel ports
const devToolsPorts: Map<number, chrome.runtime.Port> = new Map();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Ad Inspector] Background received message:', message);

  if (message.type === 'CONTENT_SCRIPT_LOADED') {
    console.log('[Ad Inspector] Content script loaded for:', message.payload.url);
  }

  if (message.type === 'AUCTION_DATA') {
    const tabId = sender.tab?.id;
    if (tabId !== undefined) {
      // Store data for this tab
      tabData.set(tabId, message.payload);

      // Forward to DevTools panel if connected
      const port = devToolsPorts.get(tabId);
      if (port) {
        port.postMessage({
          type: 'AUCTION_DATA_UPDATE',
          payload: message.payload,
        });
      }

      // Persist to file system
      writeAuctionData(message.payload);
    }
  }

  sendResponse({ success: true });
  return true;
});

// Listen for DevTools panel connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'devtools-panel') {
    const tabId = parseInt(port.sender?.tab?.id?.toString() || '-1');
    if (tabId > 0) {
      devToolsPorts.set(tabId, port);
      console.log('[Ad Inspector] DevTools panel connected for tab:', tabId);

      // Send existing data if available
      const existingData = tabData.get(tabId);
      if (existingData) {
        port.postMessage({
          type: 'AUCTION_DATA_UPDATE',
          payload: existingData,
        });
      }

      // Handle disconnect
      port.onDisconnect.addListener(() => {
        devToolsPorts.delete(tabId);
        console.log('[Ad Inspector] DevTools panel disconnected for tab:', tabId);
      });

      // Handle messages from panel
      port.onMessage.addListener((message) => {
        if (message.type === 'GET_DATA') {
          const data = tabData.get(tabId);
          if (data) {
            port.postMessage({
              type: 'AUCTION_DATA_UPDATE',
              payload: data,
            });
          }
        }
        if (message.type === 'CLEAR_DATA') {
          tabData.delete(tabId);
          port.postMessage({
            type: 'AUCTION_DATA_UPDATE',
            payload: { pageUrl: '', timestamp: Date.now(), adSlots: [] },
          });
        }
      });
    }
  }
});

console.log('[Ad Inspector] Background service worker started');
