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

interface AdSlot {
  slotCode: string;
  divId: string;
  sizes: number[][];
  bids: Bid[];
  winningBid?: Bid;
}

interface AdSlotsProps {
  adSlots: AdSlot[];
  selectedSlot: AdSlot | null;
  onSelectSlot: (slot: AdSlot) => void;
}

const AdSlots: React.FC<AdSlotsProps> = ({ adSlots, selectedSlot, onSelectSlot }) => {
  if (adSlots.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No ad slots detected yet. Navigate to a page with Prebid.js ads.
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300">
          Ad Slots ({adSlots.length})
        </h2>
      </div>
      <ul className="divide-y divide-gray-700">
        {adSlots.map((slot) => (
          <li
            key={slot.slotCode}
            onClick={() => onSelectSlot(slot)}
            className={`px-4 py-3 cursor-pointer transition-colors ${
              selectedSlot?.slotCode === slot.slotCode
                ? 'bg-blue-900/50 border-l-2 border-blue-500'
                : 'hover:bg-gray-800 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {slot.slotCode}
                </p>
                <p className="text-xs text-gray-400">
                  {slot.sizes.map(s => `${s[0]}x${s[1]}`).join(', ') || 'No sizes'}
                </p>
              </div>
              <div className="ml-3 flex flex-col items-end">
                {slot.winningBid ? (
                  <>
                    <span className="text-xs text-green-400 font-semibold">
                      ${slot.winningBid.cpm.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {slot.bids.length} bid{slot.bids.length !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    {slot.bids.length} bid{slot.bids.length !== 1 ? 's' : ''}
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

export default AdSlots;
