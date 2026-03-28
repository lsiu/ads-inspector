// Content script - listens to Prebid.js and Google Tag Manager events

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

// Store auction data per page
const auctionData: Map<string, AdSlot> = new Map();
let currentAuctionId: string | null = null;

// Get page URL
const getPageUrl = () => window.location.href;

// Send data to background service worker
const sendToBackground = (data: AdAuctionData) => {
  chrome.runtime.sendMessage({
    type: 'AUCTION_DATA',
    payload: data,
  });
};

// Collect current auction data
const collectAuctionData = (): AdAuctionData => {
  const adSlots: AdSlot[] = Array.from(auctionData.values());
  return {
    pageUrl: getPageUrl(),
    timestamp: Date.now(),
    adSlots,
  };
};

// Prebid.js event listeners
const setupPrebidListeners = () => {
  console.log('[Ad Inspector] Checking for Prebid.js...');
  
  // Wait for pbjs to be available
  const waitForPbjs = setInterval(() => {
    const pbjs = (window as any).pbjs;
    console.log('[Ad Inspector] pbjs available:', !!pbjs);
    
    if (pbjs) {
      clearInterval(waitForPbjs);

      // Listen to auction init event
      pbjs.onEvent('auctionInit', (data: any) => {
        currentAuctionId = data.auctionId;
        console.log('[Ad Inspector] Auction initialized:', data.auctionId);
      });

      // Listen to bid requested
      pbjs.onEvent('bidRequested', (data: any) => {
        console.log('[Ad Inspector] Bid requested:', data);
      });

      // Listen to bid response
      pbjs.onEvent('bidResponse', (data: any) => {
        const adUnitCode = data.adUnitCode;
        
        let adSlot = auctionData.get(adUnitCode);
        if (!adSlot) {
          adSlot = {
            slotCode: adUnitCode,
            divId: '',
            sizes: data.sizes || [],
            bids: [],
          };
          auctionData.set(adUnitCode, adSlot);
        }

        const bid: Bid = {
          bidder: data.bidderCode,
          bidId: data.requestId || data.bidId,
          cpm: data.cpm,
          currency: data.currency || 'USD',
          width: data.width || 0,
          height: data.height || 0,
          ad: data.ad || '',
          creativeId: data.creativeId,
          auctionId: data.auctionId || currentAuctionId || '',
          adUnitCode,
        };

        adSlot.bids.push(bid);
        console.log('[Ad Inspector] Bid received:', bid);

        // Send updated data to background
        sendToBackground(collectAuctionData());
      });

      // Listen to bid won
      pbjs.onEvent('bidWon', (data: any) => {
        const adUnitCode = data.adUnitCode;
        const adSlot = auctionData.get(adUnitCode);

        if (adSlot) {
          const winningBid: Bid = {
            bidder: data.bidderCode,
            bidId: data.requestId || data.bidId,
            cpm: data.cpm,
            currency: data.currency || 'USD',
            width: data.width || 0,
            height: data.height || 0,
            ad: data.ad || '',
            creativeId: data.creativeId,
            auctionId: data.auctionId || currentAuctionId || '',
            adUnitCode,
          };
          adSlot.winningBid = winningBid;
          console.log('[Ad Inspector] Bid won:', winningBid);

          // Send updated data to background
          sendToBackground(collectAuctionData());
        }
      });

      // Listen to auction end
      pbjs.onEvent('auctionEnd', (data: any) => {
        console.log('[Ad Inspector] Auction ended:', data);
        sendToBackground(collectAuctionData());
      });

      console.log('[Ad Inspector] Prebid.js listeners attached');
    }
  }, 100);

  // Stop waiting after 10 seconds (increased from 5)
  setTimeout(() => {
    clearInterval(waitForPbjs);
    console.log('[Ad Inspector] Timeout waiting for Prebid.js - pbjs not found');
  }, 10000);
};

// Google Tag Manager dataLayer listener
const setupGTMListeners = () => {
  const originalPush = (window as any).dataLayer?.push;
  
  if (originalPush) {
    (window as any).dataLayer.push = function (...args: any[]) {
      const result = originalPush.apply(this, args);
      
      args.forEach((arg: any) => {
        if (arg && typeof arg === 'object') {
          // Check for ad-related events
          if (arg.event?.includes('ad') || arg.adUnit || arg.slot) {
            console.log('[Ad Inspector] GTM ad event:', arg);
            sendToBackground(collectAuctionData());
          }
        }
      });
      
      return result;
    };
    
    console.log('[Ad Inspector] GTM dataLayer listener attached');
  }
};

// Initialize listeners
console.log('[Ad Inspector] Content script starting...');
setupPrebidListeners();
setupGTMListeners();

// Notify background that content script is loaded
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_LOADED',
  payload: { url: getPageUrl() },
});
