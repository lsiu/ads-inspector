import React, { useState } from 'react';
import type { Bid, GptInfo } from '../../shared/types';
import type { AuctionEvent } from '../types';

interface AuctionDetailsPanelProps {
  selectedAuction: AuctionEvent | null;
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
        <div className="col-span-4 text-gray-400 font-mono text-xs truncate" title={bid.bidId}>
          {bid.bidId}
        </div>
        <div className="col-span-3 text-white">{bid.bidder}</div>
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
      {expanded && bid.ad && (
        <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Ad Markup</h4>
          <div className="bg-white rounded p-2">
            <pre className="text-xs text-black whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
              {bid.ad}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const AuctionDetailsPanel: React.FC<AuctionDetailsPanelProps> = ({ selectedAuction }) => {
  if (!selectedAuction) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select an auction to view details
      </div>
    );
  }

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
              {selectedAuction.winningBid?.ad.includes('adsrvr.org/bid/feedback') && selectedAuction.winningBid?.bidder !== 'ttd' && <span className="text-blue-300"> (src: TTD)</span>}
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

      {/* All Bids */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">All Bids ({selectedAuction.bids.length})</h3>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-800 text-sm">
            <div className="col-span-4 text-gray-400">Bid ID</div>
            <div className="col-span-3 text-gray-400">Bidder</div>
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

      {/* Creative Preview */}
      {selectedAuction.winningBid?.ad ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Creative Preview
          </h3>
          <div className="bg-gray-800 rounded-lg p-4">
            <div
              className="bg-white rounded p-2"
              dangerouslySetInnerHTML={{ __html: selectedAuction.winningBid.ad }}
            />
          </div>
        </div>
      ) : selectedAuction.gpt && !selectedAuction.winningBid?.ad ? (
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Creative Preview
          </h3>
          <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
            <p>
              Creative HTML is not accessible for GPT-rendered ads.
              Ads are rendered in cross-origin iframes via SafeFrame.
            </p>
          </div>
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-white mb-2">
        Ad Markup
      </h3>
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="bg-white rounded p-2">
          <pre className="text-xs text-black whitespace-pre-wrap break-words">
            {selectedAuction.winningBid?.ad}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AuctionDetailsPanel;
