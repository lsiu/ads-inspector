// Injected script - runs in page context and has access to window.pbjs
// This script forwards individual Prebid.js events to the content script via postMessage.
// No state is accumulated here — each event is sent as-is.

import type { AuctionEventType, Bid } from '../shared/types';

function postEvent(type: AuctionEventType, payload: Record<string, unknown>) {
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

// Styled console.log with blue badge prefix
const log = (msg: string, ...args: unknown[]) => {
  console.log('%c[Ad Inspector]%c ' + msg, 'background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;font-size:11px', 'color:inherit;font-weight:normal', ...args);
};

log('Injected script loaded');

// Wait for pbjs to be available
const waitForPbjs = setInterval(() => {
  const pbjs = (window as any).pbjs;

  if (pbjs && typeof pbjs.onEvent === 'function') {
    clearInterval(waitForPbjs);
    log('Prebid.js detected!');

    // Listen to auction init event
    pbjs.onEvent('auctionInit', (data: any) => {
      const postData = {
        auctionId: data.auctionId,
        timestamp: data.timestamp,
        adUnitCodes: data.adUnitCodes || [],
        adUnits: data.adUnits || [],
      };
      log('Auction initialized:', data.auctionId, postData, data);
      // data cannot be posted directly because it is not clonable which is required for chrome postMessage passsing
      postEvent('AUCTION_INIT', postData);
    });

    // Listen to bid requested
    pbjs.onEvent('bidRequested', (data: any) => {
      const postData = {
        bidder: data.bidderCode,
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
      };
      log('Bid requested:', postData, data);
      postEvent('BID_REQUESTED', postData);
    });

    // Listen to bid response
    pbjs.onEvent('bidResponse', (data: any) => {
      const bid: Bid = {
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
        adomain: data?.adserverTargeting?.hb_adomain || undefined,
      };
      const postData = {
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
        bid,
      };
      log('Bid received:', postData, data);
      postEvent('BID_RESPONSE', postData);
    });

    // Listen to bid won
    pbjs.onEvent('bidWon', (data: any) => {
      const winningBid: Bid = {
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
        adomain: data?.adserverTargeting?.hb_adomain || undefined,
      };
      
      const postData = {
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
        winningBid,
      };
      log('Bid won:', postData, data);
      postEvent('BID_WON', postData);
    });

    // Listen to auction end
    pbjs.onEvent('auctionEnd', (data: any) => {
      const postData = {
        auctionId: data.auctionId,
        adUnitCode: data.adUnitCode,
        bidsReceived: data.bidsReceived?.length || 0,
      };
      log('Auction ended:', postData, data);
      postEvent('AUCTION_END', postData);
    });

    log('Prebid.js listeners attached');
  }
}, 200);

// Stop waiting after 30 seconds
setTimeout(() => {
  clearInterval(waitForPbjs);
  const pbjs = (window as any).pbjs;
  if (!pbjs) {
    log('Timeout: Prebid.js not found on this page');
  } else if (typeof pbjs.onEvent !== 'function') {
    log('Timeout: pbjs exists but onEvent not available');
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
            log('GTM ad event:', arg);
            postEvent('GTM_EVENT', { event: arg });
          }
        }
      });

      return result;
    };

    log('GTM dataLayer listener attached');
  }
};

setupGTMListener();

const setupGtpListener = () => {
  // Ensure googletag is initialized
  window.googletag = window.googletag || { cmd: [] };

  googletag.cmd.push(() => {
    googletag.pubads().addEventListener('slotRenderEnded', (event: googletag.events.SlotRenderEndedEvent) => {
      const slot = event.slot;
      const adUnitPath = slot.getAdUnitPath();
      const divId = slot.getSlotElementId();
      const targetingMap = slot.getTargetingMap();
     
      const pbjs = (window as any).pbjs || { que: [] };
      const auctionIdSet = new Set(pbjs.getBidResponsesForAdUnitCode(slot.getSlotElementId()).bids.map((b: Bid) => b.auctionId))

      const auctionId = getAuctionId(auctionIdSet, adUnitPath, divId, event, targetingMap);

      const postData = {
        auctionId,
        adUnitPath,
        divId,
        creativeId: event.creativeId,
        lineItemId: event.lineItemId,
        advertiserId: event.advertiserId,
        campaignId: event.campaignId,
        isEmpty: event.isEmpty,
        isBackfill: event.isBackfill,
        size: event.size,
        sourceAgnosticCreativeId: event.sourceAgnosticCreativeId,
        sourceAgnosticLineItemId: event.sourceAgnosticLineItemId,
        ad: slot.getHtml(),
      };
      log('GPT slot render ended:', postData, event, targetingMap);

      postEvent('GPT_RENDER_ENDED', postData);
    });
  });
};

setupGtpListener();

// Listen for highlight requests from content script
window.addEventListener('message', (event) => {
  if (event.data && event.data.source === 'auction-inspector' && event.data.type === 'HIGHLIGHT_SLOT') {
    const { slotCode } = event.data.payload;
    log('Highlighting slot:', slotCode);

    // Find element by id = slotCode
    const el = document.getElementById(slotCode);
    if (!el) {
      log('Element not found:', slotCode);
      return;
    }

    // Scroll to the element
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Apply red dotted border
    const originalBorder = el.style.border;
    const originalTransformOrigin = el.style.transformOrigin;
    el.style.border = '3px dotted red';
    el.style.transformOrigin = 'center center';

    // Animate a full 360° rotation
    const animation = el.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' },
    ], {
      duration: 1000,
      easing: 'ease-in-out',
    });

    // Remove highlight after animation completes
    animation.onfinish = () => {
      // Keep the border for a moment after animation so user can see it
      setTimeout(() => {
        el.style.border = originalBorder;
        el.style.transformOrigin = originalTransformOrigin;
      }, 3000);
    };
  }
});

function getAuctionId(auctionIdSet: Set<unknown>, adUnitPath: string, divId: string, event: googletag.events.SlotRenderEndedEvent, targetingMap: Record<string, string | string[]>) {
  const possibleKeys = ['hb_auctionid', 'prebid_auction_id', 'hb_auction_id'];
  for (const key of possibleKeys) {
    const value = targetingMap[key];
    if (value) {
      const id = Array.isArray(value) ? value[0] : value;
      if (typeof id === 'string') {
        log(`Found auction ID in targeting: ${key}=${id}`);
        return id;
      }
    }
  }

  if (auctionIdSet.size === 1) {
    return Array.from(auctionIdSet).pop() ?? null;
  } 
  
  if (auctionIdSet.size === 0) {
    // this can be normal if the GPT slot is not related to a Prebid auction, so we just return undefined without logging an error
    return undefined;
  }
  
  console.error('[Ad Inspector] GPT slot render ended with no or multiple auction IDs:', auctionIdSet?.size, Array.from(auctionIdSet).join(', '), adUnitPath, divId, event, targetingMap);
}
