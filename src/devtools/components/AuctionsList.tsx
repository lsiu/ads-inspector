import React from 'react';

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
  timestamp: number;
  bids: Bid[];
  winningBid?: Bid;
  sizes: number[][];
}

interface AuctionsListProps {
  auctions: AuctionEvent[];
  selectedAuction: AuctionEvent | null;
  onSelectAuction: (auction: AuctionEvent) => void;
}

const AuctionsList: React.FC<AuctionsListProps> = ({ auctions, selectedAuction, onSelectAuction }) => {
  if (auctions.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No auctions detected yet. Navigate to a page with Prebid.js ads.
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300">
          Auction Events ({auctions.length})
        </h2>
      </div>
      <ul className="divide-y divide-gray-700">
        {auctions.map((auction) => (
          <li
            data-auction-id={auction.id}
            key={auction.id}
            onClick={() => onSelectAuction(auction)}
            className={`px-4 py-3 cursor-pointer transition-colors ${
              selectedAuction?.id === auction.id
                ? 'bg-blue-900/50 border-l-2 border-blue-500'
                : 'hover:bg-gray-800 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {auction.slotCode}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(auction.timestamp).toLocaleTimeString()} · {auction.sizes.map(s => `${s[0]}x${s[1]}`).join(', ') || 'No sizes'}
                </p>
              </div>
              <div className="ml-3 flex flex-col items-end">
                {auction.winningBid ? (
                  <>
                    <span className="text-xs text-green-400 font-semibold">
                      ${auction.winningBid.cpm.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {auction.bids.length} bid{auction.bids.length !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    {auction.bids.length} bid{auction.bids.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AuctionsList;
