import React, { useState } from 'react';
import type { Bid, GptInfo, AdSlot } from '../../shared/types';
import type { SourceDetectionConfig } from '../../shared/types';
import CreativePreview from './CreativePreview';

interface AuctionDetailsPanelProps {
  selectedAuction: AdSlot | null;
  sourceDetectionConfig?: SourceDetectionConfig;
}

/** Expandable bid row that shows ad markup when clicked */
const BidRow: React.FC<{
  bid: Bid;
  isWinner: boolean;
}> = ({ bid, isWinner }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-t border-gray-700">
      <div
        onClick={() => setExpanded(!expanded)}
        className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
          isWinner ? 'bg-green-900/20 hover:bg-green-900/30' : 'hover:bg-gray-800'
        }`}
      >
        <div className="col-span-3 text-gray-400 font-mono text-xs truncate" title={bid.bidId}>
          {bid.bidId}
        </div>
        <div className="col-span-2 text-white">{bid.bidder}</div>
        <div className="col-span-2 text-white">
          {bid.adomain || 'unknown'}
        </div>
        <div className="col-span-2 text-right text-green-400">
          {bid.currency} {bid.cpm.toFixed(2)}
        </div>
        <div className="col-span-2 text-right text-gray-300">
          {bid.width}x{bid.height}
        </div>
        <div className="col-span-1">
          {isWinner ? (
            <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded">
              Winner
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
              Lost
            </span>
          )}
        </div>
      </div>
      {/* Expanded Ad Markup */}
      {expanded && (
        <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
          <CreativePreview adHtml={bid.ad} />
        </div>
      )} 
    </div>
  );
};

const AuctionDetailsPanel: React.FC<AuctionDetailsPanelProps> = ({ selectedAuction, sourceDetectionConfig }) => {
  const config: SourceDetectionConfig = sourceDetectionConfig || {
    adMarkupPattern: 'adsrvr.org/bid/feedback',
    attributedBidder: 'ttd',
    enabled: true,
  };
  if (!selectedAuction) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select an auction to view details
      </div>
    );
  }

  const respondedBidderSet = new Set(selectedAuction.bids.map((bid) => bid.bidder));
  const respondedBidIdSet = new Set(selectedAuction.bids.map((bid) => bid.bidId));
  const requestedByBidder = new Map<string, { requested: number; responded: number }>();

  (selectedAuction.requestedBids || []).forEach((requestedBid) => {
    const bidderStats = requestedByBidder.get(requestedBid.bidder) || { requested: 0, responded: 0 };
    bidderStats.requested += 1;

    const didRespond = requestedBid.bidId
      ? respondedBidIdSet.has(requestedBid.bidId)
      : respondedBidderSet.has(requestedBid.bidder);

    if (didRespond) {
      bidderStats.responded += 1;
    }

    requestedByBidder.set(requestedBid.bidder, bidderStats);
  });

  const requestedBidderRows = Array.from(requestedByBidder.entries())
    .map(([bidder, stats]) => ({
      bidder,
      requested: stats.requested,
      responded: stats.responded,
    }))
    .sort((a, b) => a.bidder.localeCompare(b.bidder));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white mb-2">
          {selectedAuction.slotCode}
        </h2>
        <p className="text-xs text-gray-500 font-mono truncate" title={selectedAuction.auctionId}>
          {selectedAuction.auctionId || 'unknown'}
        </p>
        <p className="text-sm text-gray-400">
          Auction Time: {new Date(selectedAuction.timestamp).toLocaleTimeString()}
        </p>
        <p className="text-sm text-gray-400">
          Sizes: {selectedAuction.sizes.map(s => `${s[0]}x${s[1]}`).join(', ') || 'Not specified'}
        </p>
        <p className="text-sm text-gray-400">
          Media Types: {Object.keys(selectedAuction?.mediaTypes || {}).join(', ') || 'Not specified'}
        </p>
      </div>

      {/* Winning Bid */}
      {selectedAuction.winningBid && (
        <div className={`rounded-lg p-4 border ${
          selectedAuction.winningBid.bidder.includes('Google Ad Manager')
            ? 'bg-blue-900/30 border-blue-700'
            : 'bg-green-900/30 border-green-700'
        }`}>
          <h3 className="text-lg font-semibold mb-2">
            <span className={selectedAuction.winningBid.bidder.includes('Google Ad Manager') ? 'text-blue-400' : 'text-green-400'}>
              {selectedAuction.winningBid.bidder.includes('Google Ad Manager') ? '🏢 ' : '🏆 '}
              {selectedAuction.winningBid.bidder}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Bidder:</span>
              <span className="ml-2 text-white">{selectedAuction.winningBid.bidder}</span>
              {config.enabled && selectedAuction.winningBid?.ad.includes(config.adMarkupPattern) && selectedAuction.winningBid?.bidder !== config.attributedBidder && <span className="text-blue-300"> (src: {config.attributedBidder.toUpperCase()})</span>}
            </div>
            <div>
              <span className="text-gray-400">CPM:</span>
              <span className="ml-2 text-green-400 font-semibold">
                {selectedAuction.winningBid.cpm > 0
                  ? `${selectedAuction.winningBid.currency} ${selectedAuction.winningBid.cpm}`
                  : 'N/A (direct/backfill)'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Size:</span>
              <span className="ml-2 text-white">
                {selectedAuction.winningBid.width}x{selectedAuction.winningBid.height}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Creative ID:</span>
              <span className="ml-2 text-white">
                {selectedAuction.winningBid.creativeId || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Bid ID:</span>
              <span className="ml-2 text-white">
                {selectedAuction.winningBid.bidId || 'unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Adv. Domain</span>
              <span className="ml-2 text-white">
                {selectedAuction.winningBid.adomain || 'unknown'}
              </span>
            </div>
          </div>

          {/* GPT Metadata */}
          {selectedAuction.gpt && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">GPT Render Info</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-400">Advertiser ID:</span>
                  <span className="ml-2 text-white">
                    {selectedAuction.gpt.advertiserId ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Campaign ID:</span>
                  <span className="ml-2 text-white">
                    {selectedAuction.gpt.campaignId ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Line Item ID:</span>
                  <span className="ml-2 text-white">
                    {selectedAuction.gpt.lineItemId ?? selectedAuction.gpt.sourceAgnosticLineItemId ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">GPT Creative ID:</span>
                  <span className="ml-2 text-white">
                    {selectedAuction.gpt.creativeId ?? selectedAuction.gpt.sourceAgnosticCreativeId ?? 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Backfill:</span>
                  <span className="ml-2 text-white">
                    {selectedAuction.gpt.isBackfill ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Div ID:</span>
                  <span className="ml-2 text-white font-mono text-xs">
                    {selectedAuction.gpt.divId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Creative Preview */}
      <CreativePreview 
        adHtml={selectedAuction.winningBid?.ad} 
        gpt={selectedAuction.gpt} 
      />

      {/* Requested Bidders */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Requested Bidders ({requestedBidderRows.length})
        </h3>
        {requestedBidderRows.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 bg-gray-800 rounded">
            No bidder request data captured for this auction yet.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-800 text-sm">
              <div className="col-span-5 text-gray-400">Bidder</div>
              <div className="col-span-2 text-right text-gray-400">Requested</div>
              <div className="col-span-2 text-right text-gray-400">Responded</div>
              <div className="col-span-3 text-left text-gray-400">Status</div>
            </div>
            {requestedBidderRows.map((row) => {
              const hasResponse = row.responded > 0;
              const statusLabel = hasResponse
                ? 'Responded'
                : selectedAuction.auctionEnded
                  ? 'No response'
                  : 'Pending';
              const statusClassName = hasResponse
                ? 'bg-green-600 text-white'
                : selectedAuction.auctionEnded
                  ? 'bg-red-700 text-white'
                  : 'bg-yellow-600 text-gray-900';

              return (
                <div key={row.bidder} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t border-gray-700">
                  <div className="col-span-5 text-white truncate" title={row.bidder}>{row.bidder}</div>
                  <div className="col-span-2 text-right text-gray-300">{row.requested}</div>
                  <div className="col-span-2 text-right text-gray-300">{row.responded}</div>
                  <div className="col-span-3">
                    <span className={`px-2 py-0.5 text-xs rounded ${statusClassName}`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Bids */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">All Bids ({selectedAuction.bids.length})</h3>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-800 text-sm">
            <div className="col-span-3 text-gray-400">Bid ID</div>
            <div className="col-span-2 text-gray-400">Bidder</div>
            <div className="col-span-2 text-gray-400">Adv. Domain</div>
            <div className="col-span-2 text-right text-gray-400">CPM</div>
            <div className="col-span-2 text-right text-gray-400">Size</div>
            <div className="col-span-1 text-left text-gray-400">Status</div>
          </div>
          {/* Bid Rows */}
          {selectedAuction.bids.map((bid, index) => (
            <BidRow
              key={index}
              bid={bid}
              isWinner={selectedAuction.winningBid?.bidId === bid.bidId}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailsPanel;
