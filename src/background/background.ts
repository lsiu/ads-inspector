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

// DevTools panel ports - keyed by inspected window tab ID
const devToolsPorts: Map<number, chrome.runtime.Port> = new Map();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Ad Inspector] Background received message:', message);
  console.log('[Ad Inspector] Sender info:', {
    tabId: sender.tab?.id,
    frameId: sender.frameId,
    url: sender.url,
  });

  if (message.type === 'CONTENT_SCRIPT_LOADED') {
    console.log('[Ad Inspector] Content script loaded for:', message.payload.url);
  }

  if (message.type === 'AUCTION_DATA') {
    const tabId = sender.tab?.id;
    console.log('[Ad Inspector] Processing AUCTION_DATA for tabId:', tabId);
    
    if (tabId !== undefined) {
      // Store data for this tab
      tabData.set(tabId, message.payload);
      console.log('[Ad Inspector] Stored data, adSlots count:', message.payload.adSlots.length);

      // Broadcast to ALL connected DevTools panels
      devToolsPorts.forEach((port, portTabId) => {
        console.log('[Ad Inspector] Broadcasting to panel for tab:', portTabId);
        port.postMessage({
          type: 'AUCTION_DATA_UPDATE',
          payload: message.payload,
        });
      });

      // Persist to file system
      writeAuctionData(message.payload);
    } else {
      console.log('[Ad Inspector] No tabId in sender');
    }
  }

  sendResponse({ success: true });
  return true;
});

// Listen for DevTools panel connections
chrome.runtime.onConnect.addListener((port) => {
  console.log('[Ad Inspector] onConnect:', port.name, 'Tab:', port.sender?.tab?.id);
  
  if (port.name === 'devtools-panel') {
    // Get the tab ID from the inspected window
    const tabId = port.sender?.tab?.id;
    console.log('[Ad Inspector] DevTools panel connecting, tabId from sender:', tabId);
    
    // For DevTools panels, we need to get the inspected window's tab ID
    // The port.sender.tab might be undefined, so we use a workaround
    if (port.sender?.id === chrome.runtime.id) {
      // This is a connection from our own extension
      // We'll store it and match by tabId when data arrives
      const portKey = tabId || Date.now(); // Use tabId or temporary key
      devToolsPorts.set(portKey, port);
      console.log('[Ad Inspector] DevTools panel connected with key:', portKey);
      console.log('[Ad Inspector] Current tabData keys:', Array.from(tabData.keys()));
      console.log('[Ad Inspector] Current port keys:', Array.from(devToolsPorts.keys()));

      // Send existing data for ANY tab
      const allData: AdAuctionData = {
        pageUrl: '',
        timestamp: Date.now(),
        adSlots: [],
      };
      
      tabData.forEach((data) => {
        allData.adSlots.push(...data.adSlots);
        if (!allData.pageUrl) allData.pageUrl = data.pageUrl;
      });
      
      console.log('[Ad Inspector] Sending aggregated data, slots:', allData.adSlots.length);
      port.postMessage({
        type: 'AUCTION_DATA_UPDATE',
        payload: allData,
      });

      // Handle disconnect
      port.onDisconnect.addListener(() => {
        devToolsPorts.delete(portKey);
        console.log('[Ad Inspector] DevTools panel disconnected for key:', portKey);
      });

      // Handle messages from panel
      port.onMessage.addListener((message) => {
        console.log('[Ad Inspector] Received message from panel:', message);
        if (message.type === 'GET_DATA') {
          // Return all data from all tabs
          const allData: AdAuctionData = {
            pageUrl: '',
            timestamp: Date.now(),
            adSlots: [],
          };
          
          tabData.forEach((data) => {
            allData.adSlots.push(...data.adSlots);
            if (!allData.pageUrl) allData.pageUrl = data.pageUrl;
          });
          
          port.postMessage({
            type: 'AUCTION_DATA_UPDATE',
            payload: allData,
          });
        }
        if (message.type === 'CLEAR_DATA') {
          tabData.clear();
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
