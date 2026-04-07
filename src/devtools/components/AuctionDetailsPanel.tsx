import React from 'react';
import type { Bid, GptInfo } from '../../shared/types';

interface AuctionEvent {
  id: string;
  slotCode: string;
  auctionId: string;
  timestamp: number;
  bids: Bid[];
  winningBid?: Bid;
  sizes: number[][];
  gpt?: GptInfo;
}

interface AuctionDetailsPanelProps {
  selectedAuction: AuctionEvent | null;
}

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
            </div>
            <div>
              <span className="text-gray-400">CPM:</span>
              <span className="ml-2 text-green-400 font-semibold">
                {selectedAuction.winningBid.cpm > 0
                  ? `$${selectedAuction.winningBid.cpm.toFixed(2)}`
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-gray-400">Bid ID</th>
                <th className="px-3 py-2 text-left text-gray-400">Bidder</th>
                <th className="px-3 py-2 text-right text-gray-400">CPM</th>
                <th className="px-3 py-2 text-right text-gray-400">Size</th>
                <th className="px-3 py-2 text-left text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {selectedAuction.bids.map((bid, index) => (
                <tr
                  key={index}
                  className={`border-t border-gray-700 ${
                    selectedAuction.winningBid?.bidId === bid.bidId
                      ? 'bg-green-900/20'
                      : ''
                  }`}
                >
                  <td className="px-3 py-2 text-gray-400 font-mono text-xs" title={bid.bidId}>{bid.bidId}</td>
                  <td className="px-3 py-2 text-white">{bid.bidder}</td>
                  <td className="px-3 py-2 text-right text-green-400">
                    ${bid.cpm.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-300">
                    {bid.width}x{bid.height}
                  </td>
                  <td className="px-3 py-2">
                    {selectedAuction.winningBid?.bidId === bid.bidId ? (
                      <span className="px-2 py-0.5 text-xs bg-green-600 text-white rounded">
                        Winner
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-gray-600 text-gray-300 rounded">
                        Lost
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
