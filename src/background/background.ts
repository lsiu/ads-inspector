// Background service worker - handles message routing, state accumulation, and data persistence

import { initStorage, isDirectoryConfigured, getDirectoryName, clearDirectoryConfig, refreshDirectoryCache } from './storage';
import { handleAuctionEvent, tabData, auctionFiles } from './auction-manager';
import type {
  AuctionEventType,
  AuctionEventMessage,
  AdAuctionData,
} from '../shared/types';

// DevTools panel ports keyed by tab ID
const devToolsPorts: Map<number, chrome.runtime.Port> = new Map();

// Initialize storage on startup
initStorage().then(() => {
  console.log('[Ad Inspector] Background service worker initialized');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Ad Inspector] Background received message:', message.type);

  if (message.type === 'CONTENT_SCRIPT_LOADED') {
    console.log('[Ad Inspector] Content script loaded for:', message.payload.url);
    return false; // No response needed
  }

  if (message.type === 'DIRECTORY_HANDLE_STORED') {
    refreshDirectoryCache();
    return false; // No response needed
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

      // Accumulate state and write to per-auction file
      handleAuctionEvent(tabId, eventMessage);

      // Broadcast accumulated state to DevTools panels
      const snapshot = tabData.get(tabId);
      if (snapshot) {
        devToolsPorts.forEach((port) => {
          port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: snapshot });
        });
      }
    }
  }

  sendResponse({ success: true });
  return true;
});

// Listen for port connections (devtools panel)
chrome.runtime.onConnect.addListener((port) => {
  console.log('[Ad Inspector] onConnect:', port.name);

  if (port.name === 'devtools-panel') {

    // Send directory status
    Promise.all([isDirectoryConfigured(), getDirectoryName()]).then(([configured, name]) => {
      port.postMessage({
        type: 'DIRECTORY_STATUS',
        isConfigured: configured,
        directoryName: name,
      });
    });

    const extensionListener = (message, senderPort) => {
      console.log('[Ad Inspector] Received from panel:', message);

      if (message.type === 'INIT') {
        devToolsPorts.set(message.tabId, senderPort);
        console.log('[Ad Inspector] Panel initialized for tab:', message.tabId);
        return;
      }

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
        auctionFiles.clear();
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

      if (message.type === 'HIGHLIGHT_SLOT') {
        const { slotCode, tabId } = message.payload;
        console.log('[Ad Inspector] Highlighting slot:', slotCode, 'on tab:', tabId);
        chrome.tabs.sendMessage(tabId, {
          type: 'HIGHLIGHT_SLOT',
          payload: { slotCode },
        });
      }
    };

    port.onMessage.addListener(extensionListener);

    // Send existing accumulated data
    const allData: AdAuctionData = { pageUrl: '', timestamp: Date.now(), adSlots: [] };
    tabData.forEach((data) => {
      allData.adSlots.push(...data.adSlots);
      if (!allData.pageUrl) allData.pageUrl = data.pageUrl;
    });
    
    port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: allData });

    port.onDisconnect.addListener((port) => {
      port.onMessage.removeListener(extensionListener);
      // Clean up the connection mapping
      const tabs = devToolsPorts.keys();
      for (const t of tabs) {
        if (devToolsPorts.get(t) === port) {
          devToolsPorts.delete(t);
          break;
        }
      }
    });
  }
});

// Clear auction data when a tab navigates or reloads
chrome.webNavigation.onCommitted.addListener((details) => {
  // Only main frame navigation
  if (details.frameId !== 0) return;

  const tabId = details.tabId;
  console.log('[Ad Inspector] Page navigation detected for tab:', tabId, details.url);

  // Clear all auction state for this tab
  tabData.delete(tabId);
  auctionFiles.clear();

  // Notify all connected DevTools panels
  devToolsPorts.forEach((port) => {
    port.postMessage({ type: 'AUCTION_DATA_UPDATE', payload: { pageUrl: '', timestamp: Date.now(), adSlots: [] } });
  });
});

console.log('[Ad Inspector] Background service worker started');
