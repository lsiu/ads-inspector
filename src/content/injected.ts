// Injected script - runs in page context and has access to window.pbjs

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

const auctionData: Map<string, AdSlot> = new Map();
let currentAuctionId: string | null = null;

console.log('[Ad Inspector] Injected script loaded');

// Wait for pbjs to be available
const waitForPbjs = setInterval(() => {
  const pbjs = (window as any).pbjs;
  
  if (pbjs && typeof pbjs.onEvent === 'function') {
    clearInterval(waitForPbjs);
    console.log('[Ad Inspector] Prebid.js detected!');

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

      // Send to content script via postMessage
      window.postMessage({
        source: 'auction-inspector',
        type: 'AUCTION_DATA',
        payload: {
          pageUrl: window.location.href,
          timestamp: Date.now(),
          adSlots: Array.from(auctionData.values()),
        },
      });
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

        // Send to content script via postMessage
        window.postMessage({
          source: 'auction-inspector',
          type: 'AUCTION_DATA',
          payload: {
            pageUrl: window.location.href,
            timestamp: Date.now(),
            adSlots: Array.from(auctionData.values()),
          },
        });
      }
    });

    // Listen to auction end
    pbjs.onEvent('auctionEnd', (data: any) => {
      console.log('[Ad Inspector] Auction ended:', data);
      
      // Send to content script via postMessage
      window.postMessage({
        source: 'auction-inspector',
        type: 'AUCTION_DATA',
        payload: {
          pageUrl: window.location.href,
          timestamp: Date.now(),
          adSlots: Array.from(auctionData.values()),
        },
      });
    });

    console.log('[Ad Inspector] Prebid.js listeners attached');
  }
}, 200);

// Stop waiting after 30 seconds
setTimeout(() => {
  clearInterval(waitForPbjs);
  const pbjs = (window as any).pbjs;
  if (!pbjs) {
    console.log('[Ad Inspector] Timeout: Prebid.js not found on this page');
  } else if (typeof pbjs.onEvent !== 'function') {
    console.log('[Ad Inspector] Timeout: pbjs exists but onEvent not available');
  }
}, 30000);

// Also listen to GTM dataLayer
const setupGTMListener = () => {
  const originalPush = (window as any).dataLayer?.push;
  
  if (originalPush) {
    (window as any).dataLayer.push = function (...args: any[]) {
      const result = originalPush.apply(this, args);
      
      args.forEach((arg: any) => {
        if (arg && typeof arg === 'object') {
          if (arg.event?.includes('ad') || arg.adUnit || arg.slot) {
            console.log('[Ad Inspector] GTM ad event:', arg);
            window.postMessage({
              source: 'auction-inspector',
              type: 'AUCTION_DATA',
              payload: {
                pageUrl: window.location.href,
                timestamp: Date.now(),
                adSlots: [],
              },
            });
          }
        }
      });
      
      return result;
    };
    
  console.log('[Ad Inspector] GTM dataLayer listener attached');
  }
};

setupGTMListener();

const setupGtpListener = () => {
    // Ensure googletag is initialized
  window.googletag = window.googletag || { cmd: [] };

  googletag.cmd.push(() => {
    googletag.pubads().addEventListener('slotRenderEnded', (event: GPTEvent) => {
      console.log({
        'Slot ID': event.slot.getSlotElementId(),
        'Source': event.serviceName, // e.g., "publisher_ads"
        'Line Item ID': event.lineItemId,
        'Is Empty?': event.isEmpty,
        'Advertiser ID': event.advertiserId
      });
    });
  });
}

setupGtpListener();