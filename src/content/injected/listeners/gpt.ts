import type { Bid } from '../../../shared/types';
import type { LogFn, PostEvent } from '../shared';

interface PbjsBidResponseApi {
  getBidResponsesForAdUnitCode?: (adUnitCode: string) => { bids?: Bid[] };
}

function getAuctionId(
  log: LogFn,
  auctionIdSet: Set<unknown>,
  adUnitPath: string,
  divId: string,
  event: googletag.events.SlotRenderEndedEvent,
  targetingMap: Record<string, string | string[]>,
) {
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

  console.error(
    '[Ad Inspector] GPT slot render ended with no or multiple auction IDs:',
    auctionIdSet.size,
    Array.from(auctionIdSet).join(', '),
    adUnitPath,
    divId,
    event,
    targetingMap,
  );

  return undefined;
}

export function setupGptListener(log: LogFn, postEvent: PostEvent) {
  // Ensure googletag is initialized
  window.googletag = window.googletag || { cmd: [] };

  googletag.cmd.push(() => {
    googletag.pubads().addEventListener('slotRenderEnded', (event: googletag.events.SlotRenderEndedEvent) => {
      const slot = event.slot;
      const adUnitPath = slot.getAdUnitPath();
      const divId = slot.getSlotElementId();
      const targetingMap = slot.getTargetingMap();

      const pbjs = (window as any).pbjs as PbjsBidResponseApi | undefined;
      const bids = pbjs?.getBidResponsesForAdUnitCode?.(divId)?.bids ?? [];
      const auctionIdSet = new Set(bids.map((b) => b.auctionId));

      const auctionId = getAuctionId(log, auctionIdSet, adUnitPath, divId, event, targetingMap);

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
        ad: slot.getHtml() || slot.getContentUrl(),
      };

      log('GPT slot render ended:', postData, event, targetingMap);
      postEvent('GPT_RENDER_ENDED', postData);
    });
  });
}