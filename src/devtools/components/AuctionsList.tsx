import React, { useState } from 'react';

interface Bid {
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

interface AuctionEvent {
  id: string;
  slotCode: string;
  auctionId: string;
  timestamp: number;
  bids: Bid[];
  winningBid?: Bid;
  sizes: number[][];
}

interface AuctionsListProps {
  auctions: Map<string, AuctionEvent[]>;
  selectedAuction: AuctionEvent | null;
  onSelectAuction: (auction: AuctionEvent) => void;
}

const AuctionsList: React.FC<AuctionsListProps> = ({ auctions, selectedAuction, onSelectAuction }) => {
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
}> = ({ slotCode, auctions, selectedAuction, onSelectAuction }) => {
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
              ${topBid.cpm.toFixed(2)}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {auctions.length}
          </span>
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
                    <span className="px-1.5 py-0.5 text-[10px] bg-green-600/30 text-green-400 rounded">
                      {auction.winningBid.bidder.includes('Google Ad Manager') ? 'GPT' : 'Prebid'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">{auction.bids.length} bids</span>
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
