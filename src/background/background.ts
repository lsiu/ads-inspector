// Background service worker - handles message routing and data persistence

import { initStorage, isDirectoryConfigured, writeAuctionData, getDirectoryName, clearDirectoryConfig } from './storage';

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

// Track if directory config has been checked
let directoryCheckRequested = false;

// Initialize storage on startup (lazy, so just a log)
initStorage().then(() => {
  console.log('[Ad Inspector] Background service worker initialized');
});

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Ad Inspector] Background received message:', message.type);

  if (message.type === 'CONTENT_SCRIPT_LOADED') {
    console.log('[Ad Inspector] Content script loaded for:', message.payload.url);
  }

  if (message.type === 'CHECK_DIRECTORY_STATUS') {
    // Use async check
    isDirectoryConfigured().then((configured) => {
      getDirectoryName().then((name) => {
        sendResponse({
          isConfigured: configured,
          directoryName: name,
        });
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'DIRECTORY_HANDLE_STORED') {
    // Options page stored the handle in IndexedDB, no need to reload (lazy init will get it)
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

  if (message.type === 'AUCTION_DATA') {
    const tabId = sender.tab?.id;
    
    if (tabId !== undefined) {
      tabData.set(tabId, message.payload);

      // Broadcast to DevTools panels
      devToolsPorts.forEach((port) => {
        port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: message.payload });
      });

      // Write to file system (lazy initialization happens inside)
      writeAuctionData(message.payload).then(() => {
        // Check if directory is configured after write attempt
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
    
    // Send directory status (async)
    Promise.all([isDirectoryConfigured(), getDirectoryName()]).then(([configured, name]) => {
      port.postMessage({
        type: 'DIRECTORY_STATUS',
        isConfigured: configured,
        directoryName: name,
      });
    });

    // Send existing data
    const allData: AdAuctionData = { pageUrl: '', timestamp: Date.now(), adSlots: [] };
    tabData.forEach((data) => {
      allData.adSlots.push(...data.adSlots);
      if (!allData.pageUrl) allData.pageUrl = data.pageUrl;
    });
    port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: allData });

    port.onDisconnect.addListener(() => devToolsPorts.delete(portKey));

    port.onMessage.addListener((message) => {
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
        chrome.tabs.create({ url: chrome.runtime.getURL('src/options/options.html') });
      }
    });
  }
});

console.log('[Ad Inspector] Background service worker started');
