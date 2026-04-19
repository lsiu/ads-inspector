import type { Bid } from '../../../shared/types';
import type { LogFn, PostEvent } from '../shared';

interface PbjsApi {
  onEvent: (eventName: string, callback: (data: any) => void) => void;
}

function getPbjs(): PbjsApi | null {
  const pbjs = (window as any).pbjs;
  if (!pbjs || typeof pbjs.onEvent !== 'function') {
    return null;
  }
  return pbjs as PbjsApi;
}

export function setupPrebidListener(log: LogFn, postEvent: PostEvent) {
  // Wait for pbjs to be available
  const waitForPbjs = setInterval(() => {
    const pbjs = getPbjs();
    if (!pbjs) {
      return;
    }

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
      // data cannot be posted directly because it is not clonable which is required for chrome postMessage passing
      postEvent('AUCTION_INIT', postData);
    });

    // Listen to bid requested
    pbjs.onEvent('bidRequested', (data: any) => {
      const requestedBids = Array.isArray(data.bids)
        ? data.bids.map((bid: any) => ({
            bidder: bid.bidder || data.bidderCode,
            bidId: bid.bidId,
            bidderRequestId: bid.bidderRequestId || data.bidderRequestId,
            adUnitCode: bid.adUnitCode || data.adUnitCode,
          }))
        : [];

      const postData = {
        auctionId: data.auctionId || '',
        bidder: data.bidderCode,
        bidderRequestId: data.bidderRequestId,
        adUnitCode: data.adUnitCode,
        sizes: data.sizes || [],
        requestedBids,
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
  }, 200);

  // Stop waiting after 30 seconds
  setTimeout(() => {
    clearInterval(waitForPbjs);
    const pbjs = (window as any).pbjs;

    if (!pbjs) {
      log('Timeout: Prebid.js not found on this page');
      return;
    }

    if (typeof pbjs.onEvent !== 'function') {
      log('Timeout: pbjs exists but onEvent not available');
    }
  }, 30000);
}