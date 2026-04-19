// Auction state management - handles auction event processing and state accumulation

import { writeAuctionFile } from './storage';
import type { AuctionFile } from './storage';
import type {
  AuctionEventMessage,
  Bid,
  GptInfo,
  AdSlot,
  AdAuctionData,
  RequestedBid,
} from '../shared/types';
import { getAdSlotId } from '../shared/types';

// Store accumulated auction state by tab ID (for Panel snapshots)
export const tabData: Map<number, AdAuctionData> = new Map();

// Accumulated events per auction (for per-auction file writes)
export const auctionFiles: Map<string, AuctionFile> = new Map();

// Track cleanup timers for auction files (auctionId -> timer)
const cleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

// Time in milliseconds before cleaning up inactive auction data
const CLEANUP_DELAY_MS = 60 * 1000; // 1 minute

/**
 * Parse GPT size values into a number array.
 * Handles array input, string formats like "300x250", or null.
 */
function parseGptSizes(sizeRaw: unknown): number[][] {
  if (Array.isArray(sizeRaw)) {
    // Could be [300, 250] or [[300, 250], [728, 90]]
    if (sizeRaw.length > 0 && Array.isArray(sizeRaw[0])) {
      return sizeRaw as number[][];
    }
    return [sizeRaw as number[]];
  }
  if (typeof sizeRaw === 'string') {
    const match = sizeRaw.match(/^(\d+)x(\d+)$/);
    if (match) {
      return [[parseInt(match[1], 10), parseInt(match[2], 10)]];
    }
  }
  return [];
}

function getOrCreateSlot(tabId: number, adUnitCode: string, auctionId: string): AdSlot | undefined {
  if (!adUnitCode) throw new Error('adUnitCode is required to get or create a slot');

  const data = tabData.get(tabId);
  if (!data) return undefined;

  // Composite key: slotCode + auctionId (same ad unit can be re-auctioned across page reloads)
  const compositeKey = getAdSlotId({ slotCode: adUnitCode, auctionId } as AdSlot);

  // Try exact composite match first
  let slot = data.adSlots.find((s) => getAdSlotId(s) === compositeKey);
  if (slot) {
    return slot;
  }

  // If we have a valid auctionId, always create a new slot
  // (prevents merging auctions from different page loads)
  if (auctionId && auctionId !== 'unknown') {
    // Get timestamp from first existing slot with matching auctionId, or use current time
    const existingSlot = data.adSlots.find(s => s.auctionId === auctionId);
    const timestamp = existingSlot?.timestamp || Date.now();
    slot = { slotCode: adUnitCode, auctionId, timestamp, divId: '', sizes: [], bids: [] };
    data.adSlots.push(slot);
    return slot;
  }

  // Fallback: match by GPT adUnitPath suffix only for events without auctionId
  const shortName = adUnitCode.split('/').pop() || adUnitCode;
  slot = data.adSlots.find((s) => s.slotCode === shortName || s.gpt?.adUnitPath === adUnitCode);
  if (slot) {
    return slot;
  }

  // Create new slot (no auctionId — use 'unknown')
  slot = { slotCode: adUnitCode, auctionId: auctionId || 'unknown', timestamp: Date.now(), divId: '', sizes: [], bids: [] };
  data.adSlots.push(slot);
  return slot;
}

function mergeRequestedBids(slot: AdSlot, requestedBids: RequestedBid[]) {
  if (!slot.requestedBids) {
    slot.requestedBids = [];
  }

  for (const requested of requestedBids) {
    const alreadyAdded = slot.requestedBids.some((existing) =>
      existing.bidder === requested.bidder &&
      existing.adUnitCode === requested.adUnitCode &&
      existing.bidId === requested.bidId,
    );

    if (!alreadyAdded) {
      slot.requestedBids.push(requested);
    }
  }
}

function accumulateAuctionDataForFileLog(auctionId: string, tabId: number, message: AuctionEventMessage): AuctionFile | undefined {
  if (auctionId) {
    let af = auctionFiles.get(auctionId);
    if (!af) {
      // Get timestamp from first existing slot with matching auctionId
      const data = tabData.get(tabId);
      const existingSlot = data?.adSlots.find(s => s.auctionId === auctionId);
      af = {
        pageUrl: message.pageUrl,
        auctionId,
        timestamp: existingSlot?.timestamp || message.timestamp,
        events: [],
        savedAt: Date.now(),
      };
      auctionFiles.set(auctionId, af);
    }
    af.events.push({
      type: message.type,
      timestamp: message.timestamp,
      data: message.data,
    });
    return af;
  }
  return undefined;
}

/**
 * Remove auction data from the map after a period of inactivity
 */
function cleanupAuction(auctionId: string): void {
  auctionFiles.delete(auctionId);
  cleanupTimers.delete(auctionId);
  console.log('[Ad Inspector] Cleaned up inactive auction:', auctionId);
}

/**
 * Schedule cleanup for an auction after CLEANUP_DELAY_MS of inactivity.
 * Clears any existing timer to reset the countdown on new activity.
 */
function scheduleCleanup(auctionId: string): void {
  // Clear existing timer if there's ongoing activity
  const existingTimer = cleanupTimers.get(auctionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => cleanupAuction(auctionId), CLEANUP_DELAY_MS);
  cleanupTimers.set(auctionId, timer);
}

function writeAuctionData(af: AuctionFile | undefined) {
  if (!af) return;

  // Write the auction file on every event
  writeAuctionFile(af).then(() => {
    // Schedule cleanup after 1 minute of inactivity
    scheduleCleanup(af.auctionId);
  });
}

export function handleAuctionEvent(tabId: number, message: AuctionEventMessage): void {
  // Extract auctionId from the event data (present on most auction events)
  const d = message.data as Record<string, unknown>;
  const auctionId = (d.auctionId as string) || '';

  if (!tabData.has(tabId)) {
    tabData.set(tabId, { pageUrl: message.pageUrl, timestamp: message.timestamp, adSlots: [] });
  }

  switch (message.type) {
    case 'AUCTION_INIT': {
      const initTimestamp = (d.timestamp as number) || message.timestamp;

      // Create initial slots for each adUnitCode in the auction
      const adUnits = (d.adUnits as object[]) || [];
      for (const adUnit of adUnits) {
        const adUnitCode = (adUnit as Record<string, unknown>).code as string;
        const sizes = (adUnit as Record<string, unknown>).sizes as number[][] || [];
        const slot = getOrCreateSlot(tabId, adUnitCode, auctionId);
        if (slot) {
          // Set sizes from AUCTION_INIT (this is the definitive source)
          slot.sizes = sizes;
          slot.mediaTypes = (adUnit as Record<string, unknown>).mediaTypes || {};
          // Set timestamp from AUCTION_INIT
          slot.timestamp = initTimestamp;
        }
      }
      break;
    }
    case 'BID_RESPONSE': {
      const { adUnitCode, bid } = d as { adUnitCode: string; sizes: number[][]; bid: Bid };
      const slot = getOrCreateSlot(tabId, adUnitCode, bid.auctionId || auctionId);
      if (!slot) return;
      // Avoid duplicate bids (by bidId)
      if (!slot.bids.some((b) => b.bidId === bid.bidId)) {
        slot.bids.push(bid);
      }
      break;
    }
    case 'BID_WON': {
      const { adUnitCode, winningBid } = d as { adUnitCode: string; winningBid: Bid };
      const slot = getOrCreateSlot(tabId, adUnitCode, winningBid.auctionId || auctionId);
      if (slot) slot.winningBid = winningBid;
      break;
    }
    case 'BID_REQUESTED': {
      const {
        adUnitCode,
        bidder,
        bidderRequestId,
        requestedBids,
      } = d as {
        adUnitCode: string;
        bidder?: string;
        bidderRequestId?: string;
        requestedBids?: RequestedBid[];
      };

      const baseRequestedBids: RequestedBid[] = Array.isArray(requestedBids)
        ? requestedBids.filter((requested) => !!requested?.adUnitCode)
        : [];

      // Some integrations only provide top-level bidder/adUnitCode on BID_REQUESTED.
      if (baseRequestedBids.length === 0 && bidder && adUnitCode) {
        baseRequestedBids.push({
          bidder,
          bidderRequestId,
          adUnitCode,
        });
      }

      for (const requested of baseRequestedBids) {
        const slot = getOrCreateSlot(tabId, requested.adUnitCode, auctionId);
        if (!slot) continue;
        mergeRequestedBids(slot, [requested]);
      }
      break;
    }
    case 'AUCTION_END': {
      const { adUnitCode } = d as { adUnitCode?: string };
      const data = tabData.get(tabId);
      if (!data) return;

      if (adUnitCode) {
        const slot = getOrCreateSlot(tabId, adUnitCode, auctionId);
        if (slot) {
          slot.auctionEnded = true;
        }
        break;
      }

      data.adSlots
        .filter((slot) => slot.auctionId === auctionId)
        .forEach((slot) => {
          slot.auctionEnded = true;
        });
      break;
    }
    case 'GPT_RENDER_ENDED': {
      const adUnitPath = (d.adUnitPath as string) || '';
      const divId = (d.divId as string) || '';
      const gptAuctionId = (d.auctionId as string) || '';
      const isEmpty = !!d.isEmpty;
      const isBackfill = !!d.isBackfill;
      const creativeId = (d.creativeId as number | null) ?? null;
      const sourceAgnosticCreativeId = (d.sourceAgnosticCreativeId as number | null) ?? null;
      const lineItemId = (d.lineItemId as number | null) ?? null;
      const sourceAgnosticLineItemId = (d.sourceAgnosticLineItemId as number | null) ?? null;
      const advertiserId = (d.advertiserId as number | null) ?? null;
      const campaignId = (d.campaignId as number | null) ?? null;
      const sizeArr = parseGptSizes(d.size);
      const firstSize = sizeArr.length > 0 ? sizeArr[0] : null;

      // Use divId as the slot key — this matches Prebid's adUnitCode
      const slotKey = divId || adUnitPath.split('/').pop() || adUnitPath;
      // Use the GPT-correlated auctionId
      const gptSlotAuctionId = gptAuctionId || auctionId;
      const slot = getOrCreateSlot(tabId, slotKey, gptSlotAuctionId);
      if (!slot) return;

      // Set sizes only if not already set (e.g., by AUCTION_INIT)
      // This may happend that adslot render ads outside of prebid auction flow
      if (sizeArr.length > 0 && (!slot.sizes || slot.sizes.length === 0)) {
        slot.sizes = sizeArr;
      }

      if (divId) slot.divId = divId;

      const gptInfo: GptInfo = {
        creativeId, sourceAgnosticCreativeId, lineItemId, sourceAgnosticLineItemId,
        advertiserId, campaignId, isEmpty, isBackfill, size: firstSize, divId, adUnitPath,
      };
      slot.gpt = gptInfo;

      // If slot has Prebid bids but no winningBid, GPT served a direct/backfill ad
      // Create a synthetic winning bid so the UI has something to show
      if (slot.bids.length > 0 && !slot.winningBid && !isEmpty) {
        slot.winningBid = {
          bidder: isBackfill ? 'Google Ad Manager (Backfill)' : 'Google Ad Manager (Direct)',
          bidId: d.bidId as string,
          cpm: 0,
          currency: d.currency as string,
          width: Array.isArray(firstSize) ? firstSize[0] : 0,
          height: Array.isArray(firstSize) ? firstSize[1] : 0,
          ad: d.ad as string,
          creativeId: String(sourceAgnosticCreativeId ?? creativeId ?? ''),
          auctionId: slot.auctionId,
          adUnitCode: slotKey,
        };
      }
      break;
    }
    case 'GTM_EVENT':
      // These event types accumulate for file writing but don't change slot state
      break;
  }

  const af = accumulateAuctionDataForFileLog(auctionId, tabId, message);

  // only write auction file on ending events
  switch (message.type) {
    case 'AUCTION_INIT':
    case 'BID_REQUESTED':
    case 'BID_RESPONSE':
    case 'GTM_EVENT':
      break;
    case 'BID_WON':
    case 'AUCTION_END':
    case 'GPT_RENDER_ENDED':
      // Write auction file on every event for these types
      writeAuctionData(af);

      break;
  }
}
