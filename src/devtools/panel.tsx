import React, { useState, useEffect } from 'react';
import AdSlots from './components/AdSlots';

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

interface AdAuctionData {
  pageUrl: string;
  timestamp: number;
  adSlots: AdSlot[];
}

const Panel: React.FC = () => {
  const [auctionData, setAuctionData] = useState<AdAuctionData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AdSlot | null>(null);
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);

  useEffect(() => {
    console.log('[Panel] Connecting to background...');
    
    // Connect to background service worker
    const connection = chrome.runtime.connect({ name: 'devtools-panel' });
    setPort(connection);

    console.log('[Panel] Connected:', connection.name, 'Tab:', connection.sender?.tab?.id);

    connection.onMessage.addListener((message) => {
      console.log('[Panel] Received message:', message);
      if (message.type === 'AUCTION_DATA_UPDATE') {
        console.log('[Panel] Updating auction data, slots:', message.payload.adSlots?.length);
        setAuctionData(message.payload);
      }
    });

    connection.onDisconnect.addListener(() => {
      console.log('[Panel] Disconnected from background');
    });

    return () => {
      console.log('[Panel] Cleaning up connection');
      connection.disconnect();
    };
  }, []);

  const handleClearData = () => {
    console.log('[Panel] Clearing data');
    if (port) {
      port.postMessage({ type: 'CLEAR_DATA' });
    }
  };

  const handleRefresh = () => {
    console.log('[Panel] Refreshing data');
    if (port) {
      port.postMessage({ type: 'GET_DATA' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-semibold text-white">Ad Auction Inspector</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={handleClearData}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Ad Slots List */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
          <AdSlots
            adSlots={auctionData?.adSlots || []}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
          />
        </div>

        {/* Details Panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedSlot ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedSlot.slotCode}
                </h2>
                <p className="text-sm text-gray-400">
                  Sizes: {selectedSlot.sizes.map(s => `${s[0]}x${s[1]}`).join(', ') || 'Not specified'}
                </p>
              </div>

              {/* Winning Bid */}
              {selectedSlot.winningBid && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">
                    Winning Bid
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Bidder:</span>
                      <span className="ml-2 text-white">{selectedSlot.winningBid.bidder}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">CPM:</span>
                      <span className="ml-2 text-green-400 font-semibold">
                        ${selectedSlot.winningBid.cpm.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Size:</span>
                      <span className="ml-2 text-white">
                        {selectedSlot.winningBid.width}x{selectedSlot.winningBid.height}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Creative ID:</span>
                      <span className="ml-2 text-white">
                        {selectedSlot.winningBid.creativeId || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* All Bids */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">All Bids</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-400">Bidder</th>
                        <th className="px-3 py-2 text-right text-gray-400">CPM</th>
                        <th className="px-3 py-2 text-right text-gray-400">Size</th>
                        <th className="px-3 py-2 text-left text-gray-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSlot.bids.map((bid, index) => (
                        <tr
                          key={index}
                          className={`border-t border-gray-700 ${
                            selectedSlot.winningBid?.bidId === bid.bidId
                              ? 'bg-green-900/20'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-white">{bid.bidder}</td>
                          <td className="px-3 py-2 text-right text-green-400">
                            ${bid.cpm.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-300">
                            {bid.width}x{bid.height}
                          </td>
                          <td className="px-3 py-2">
                            {selectedSlot.winningBid?.bidId === bid.bidId ? (
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
              {selectedSlot.winningBid?.ad && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Creative Preview
                  </h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div
                      className="bg-white rounded p-2"
                      dangerouslySetInnerHTML={{ __html: selectedSlot.winningBid.ad }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an ad slot to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Panel;
