import React, { useState, useRef } from 'react';
import type { AuctionEvent } from '../types';

interface AuctionsListProps {
  auctions: Map<string, AuctionEvent[]>;
  selectedAuction: AuctionEvent | null;
  onSelectAuction: (auction: AuctionEvent) => void;
}

const AuctionsList: React.FC<AuctionsListProps> = ({ auctions, selectedAuction, onSelectAuction }) => {
  const portRef = useRef<chrome.runtime.Port | null>(null);

  // Connect to background service worker for highlight functionality
  React.useEffect(() => {
    const port = chrome.runtime.connect({ name: 'devtools-panel' });
    portRef.current = port;
    return () => port.disconnect();
  }, []);

  const handleHighlight = (slotCode: string) => {
    if (portRef.current) {
      portRef.current.postMessage({
        type: 'HIGHLIGHT_SLOT',
        payload: { slotCode, tabId: chrome.devtools.inspectedWindow.tabId },
      });
    }
  };

  if (auctions.size === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No auctions detected yet. Navigate to a page with Prebid.js ads.
      </div>
    );
  }

  // Calculate total auctions across all groups
  const totalAuctions = Array.from(auctions.values()).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div>
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300">
          Auction Events ({auctions.size} slot{auctions.size !== 1 ? 's' : ''}, {totalAuctions} auction{totalAuctions !== 1 ? 's' : ''})
        </h2>
      </div>
      <div className="divide-y divide-gray-700">
        {Array.from(auctions.entries()).map(([slotCode, events]) => (
          <AdSlotGroup
            key={slotCode}
            slotCode={slotCode}
            auctions={events}
            selectedAuction={selectedAuction}
            onSelectAuction={onSelectAuction}
            onHighlight={handleHighlight}
          />
        ))}
      </div>
    </div>
  );
};

/** Renders a collapsible group of auctions for a single ad unit */
const AdSlotGroup: React.FC<{
  slotCode: string;
  auctions: AuctionEvent[];
  selectedAuction: AuctionEvent | null;
  onSelectAuction: (auction: AuctionEvent) => void;
  onHighlight: (slotCode: string) => void;
}> = ({ slotCode, auctions, selectedAuction, onSelectAuction, onHighlight }) => {
  const [expanded, setExpanded] = useState(true);

  const topBid = auctions.reduce((a1, a2) => (a1.winningBid?.cpm || 0) > (a2.winningBid?.cpm || 0) ? a1 : a2).winningBid;
  const isAnySelected = auctions.some((a) => selectedAuction?.id === a.id);

  return (
    <div className={isAnySelected ? 'bg-blue-900/20' : ''}>
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors"
      >
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-white truncate">
            {expanded ? '▾' : '▸'} {slotCode}
          </p>
        </div>
        <div className="ml-2 flex items-center gap-2">
          {topBid && (
            <span className="text-xs text-green-400 font-semibold">
              {topBid.currency} {topBid.cpm.toFixed(2)}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {auctions.length} auction{auctions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onHighlight(slotCode); }}
            className="text-xs px-1.5 py-0.5 rounded hover:bg-gray-600 transition-colors"
            title="Highlight on page"
          >
            🎯
          </button>
        </div>
      </button>

      {/* Auction list */}
      {expanded && (
        <ul className="divide-y divide-gray-700/50">
          {auctions.map((auction) => (
            <li
              data-auction-id={auction.id}
              key={auction.id}
              onClick={() => onSelectAuction(auction)}
              className={`pl-8 pr-4 py-2 cursor-pointer transition-colors text-xs ${
                selectedAuction?.id === auction.id
                  ? 'bg-blue-900/50 border-l-2 border-blue-500'
                  : 'hover:bg-gray-800 border-l-2 border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 font-mono truncate" title={auction.auctionId}>
                    {auction.auctionId ? `${auction.auctionId.slice(0, 8)}…` : 'unknown'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(auction.timestamp).toLocaleTimeString()} · {auction.sizes.map(s => `${s[0]}x${s[1]}`).join(', ') || 'No sizes'}
                  </p>
                </div>
                <div className="ml-2 flex flex-col items-end">
                  {auction.winningBid ? (
                    <>
                      <span>
                      <span className="text-gray-300 truncate max-w-[200px]" title={auction.winningBid.bidder}>
                      {auction.winningBid.bidder}
                      </span>
                      {auction.winningBid?.ad.includes('adsrvr.org/bid/feedback') && auction.winningBid?.bidder !== 'ttd' && <span className="text-blue-300"> (src: TTD)</span>}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                      auction.winningBid.bidder.includes('Google Ad Manager')
                        ? 'bg-yellow-600/30 text-yellow-400'
                        : 'bg-green-600/30 text-green-400'
                      }`}>
                      {auction.winningBid.currency} {auction.winningBid.cpm.toFixed(2)}
                      </span>
                      
                    </>
                    ) : (
                    <span className="text-xs text-gray-600 px-2">{auction.bids.length} bids</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AuctionsList;
