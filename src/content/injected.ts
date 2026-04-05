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
      log('Auction initialized:', data.auctionId, data);
      postEvent('AUCTION_INIT', {
        auctionId: data.auctionId,
        timestamp: data.timestamp,
        adUnitCodes: data.adUnitCodes || [],
      });
    });

    // Listen to bid requested
    pbjs.onEvent('bidRequested', (data: any) => {
      log('Bid requested:', data);
      postEvent('BID_REQUESTED', {
        bidder: data.bidderCode,
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
      });
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
      };

      log('Bid received:', bid, data);
      postEvent('BID_RESPONSE', {
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
        bid,
      });
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
      };

      log('Bid won:', winningBid, data);
      postEvent('BID_WON', {
        auctionId: data.auctionId || '',
        adUnitCode: data.adUnitCode,
        winningBid,
      });
    });

    // Listen to auction end
    pbjs.onEvent('auctionEnd', (data: any) => {
      log('Auction ended:', data.auctionId);
      postEvent('AUCTION_END', {
        auctionId: data.auctionId,
        adUnitCode: data.adUnitCode,
        bidsReceived: data.bidsReceived?.length || 0,
      });
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

      if (auctionIdSet.size === 0 || auctionIdSet.size > 1) {
        console.error('[Ad Inspector] GPT slot render ended with no or multiple auction IDs:', auctionIdSet.size, adUnitPath, divId, event, targetingMap);
      }
      const auctionId = Array.from(auctionIdSet).pop() ?? null;

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
      };
      log('GPT slot render ended:', postData, event, targetingMap);

      postEvent('GPT_RENDER_ENDED', postData);
    });
  });
};

setupGtpListener();