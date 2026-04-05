// Injected script - runs in page context and has access to window.pbjs
// This script forwards individual Prebid.js events to the content script via postMessage.
// No state is accumulated here — each event is sent as-is.

interface BidEvent {
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

function postEvent(type: string, payload: Record<string, unknown>) {
  window.postMessage({
    source: 'auction-inspector',
    type,
    payload: {
      pageUrl: window.location.href,
      timestamp: Date.now(),
      ...payload,
    },
  });
}

console.log('[Ad Inspector] Injected script loaded');

// Wait for pbjs to be available
const waitForPbjs = setInterval(() => {
  const pbjs = (window as any).pbjs;

  if (pbjs && typeof pbjs.onEvent === 'function') {
    clearInterval(waitForPbjs);
    console.log('[Ad Inspector] Prebid.js detected!');

    // Listen to auction init event
    pbjs.onEvent('auctionInit', (data: any) => {
      console.log('[Ad Inspector] Auction initialized:', data.auctionId);
      postEvent('AUCTION_INIT', {
        auctionId: data.auctionId,
        timestamp: data.timestamp,
        adUnitCodes: data.adUnitCodes || [],
      });
    });

    // Listen to bid requested
    pbjs.onEvent('bidRequested', (data: any) => {
      console.log('[Ad Inspector] Bid requested:', data);
      postEvent('BID_REQUESTED', {
        bidder: data.bidderCode,
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
      });
    });

    // Listen to bid response
    pbjs.onEvent('bidResponse', (data: any) => {
      const bid: BidEvent = {
        bidder: data.bidderCode,
        bidId: data.requestId || data.bidId,
        cpm: data.cpm,
        currency: data.currency || 'USD',
        width: data.width || 0,
        height: data.height || 0,
        ad: data.ad || '',
        creativeId: data.creativeId,
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
      };

      console.log('[Ad Inspector] Bid received:', bid);
      postEvent('BID_RESPONSE', {
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
        bid,
      });
    });

    // Listen to bid won
    pbjs.onEvent('bidWon', (data: any) => {
      const winningBid: BidEvent = {
        bidder: data.bidderCode,
        bidId: data.requestId || data.bidId,
        cpm: data.cpm,
        currency: data.currency || 'USD',
        width: data.width || 0,
        height: data.height || 0,
        ad: data.ad || '',
        creativeId: data.creativeId,
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
      };

      console.log('[Ad Inspector] Bid won:', winningBid);
      postEvent('BID_WON', {
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
        winningBid,
      });
    });

    // Listen to auction end
    pbjs.onEvent('auctionEnd', (data: any) => {
      console.log('[Ad Inspector] Auction ended:', data.auctionId);
      postEvent('AUCTION_END', {
        auctionId: data.auctionId,
        adUnitCode: data.adUnitCode,
        bidsReceived: data.bidsReceived?.length || 0,
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
            postEvent('GTM_EVENT', { event: arg });
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
      console.log('[Ad Inspector] GPT slot render ended:', {
        'Slot ID': event.slot.getSlotElementId(),
        'Source': event.serviceName,
        'Line Item ID': event.lineItemId,
        'Is Empty?': event.isEmpty,
        'Advertiser ID': event.advertiserId,
      });
      postEvent('GPT_RENDER_ENDED', {
        slotId: event.slot.getSlotElementId(),
        serviceName: event.serviceName,
        lineItemId: event.lineItemId,
        isEmpty: event.isEmpty,
        advertiserId: event.advertiserId,
      });
    });
  });
};

setupGtpListener();