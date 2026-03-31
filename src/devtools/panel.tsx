import React, { useState, useEffect } from 'react';
import AuctionsList from './components/AuctionsList';

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

interface AuctionEvent {
  id: string;
  slotCode: string;
  timestamp: number;
  bids: Bid[];
  winningBid?: Bid;
  sizes: number[][];
}

const Panel: React.FC = () => {
  const [auctionEvents, setAuctionEvents] = useState<AuctionEvent[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<AuctionEvent | null>(null);
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);
  const [isDirectoryConfigured, setIsDirectoryConfigured] = useState<boolean>(false);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Panel] Connecting to background...');
    
    // Connect to background service worker
    const connection = chrome.runtime.connect({ name: 'devtools-panel' });
    setPort(connection);

    console.log('[Panel] Connected:', connection.name);

    connection.onMessage.addListener((message) => {
      console.log('[Panel] Received message:', message.type);
      
      if (message.type === 'AUCTION_DATA_UPDATE') {
        console.log('[Panel] Updating auction data, slots:', message.payload.adSlots?.length);
        
        // Convert adSlots to individual auction events
        const events: AuctionEvent[] = [];
        message.payload.adSlots?.forEach((slot: AdSlot) => {
          // Create an auction event for each slot
          const event: AuctionEvent = {
            id: `${slot.slotCode}-${slot.bids[0]?.auctionId || Date.now()}`,
            slotCode: slot.slotCode,
            timestamp: message.payload.timestamp,
            bids: slot.bids,
            winningBid: slot.winningBid,
            sizes: slot.sizes,
          };
          events.push(event);
        });
        
        // Sort by timestamp (newest first)
        events.sort((a, b) => b.timestamp - a.timestamp);
        setAuctionEvents(events);
      }
      
      if (message.type === 'DIRECTORY_STATUS') {
        setIsDirectoryConfigured(message.isConfigured);
        setDirectoryName(message.directoryName);
      }
      
      if (message.type === 'DIRECTORY_NOT_CONFIGURED') {
        setIsDirectoryConfigured(false);
        setDirectoryName(null);
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

  const handleOpenOptions = () => {
    console.log('[Panel] Opening options page');
    if (port) {
      port.postMessage({ type: 'OPEN_OPTIONS' });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <h1 className="text-lg font-semibold text-white">Ad Auction Inspector</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenOptions}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 rounded transition-colors"
            title="Configure storage directory"
          >
            ⚙️ Settings
          </button>
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

      {/* Directory Warning Banner */}
      {!isDirectoryConfigured && (
        <div className="bg-yellow-900/50 border-b border-yellow-700 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-yellow-400 text-sm">
              ⚠️ Storage directory not configured. Auction data will not be saved to disk.
            </p>
            <button
              onClick={handleOpenOptions}
              className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
            >
              Configure
            </button>
          </div>
        </div>
      )}

      {/* Directory Info Banner */}
      {isDirectoryConfigured && directoryName && (
        <div className="bg-green-900/30 border-b border-green-700 px-4 py-2">
          <p className="text-green-400 text-sm">
            ✓ Saving to: <span className="font-mono">{directoryName}</span>
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Auctions List */}
        <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
          <AuctionsList
            auctions={auctionEvents}
            selectedAuction={selectedAuction}
            onSelectAuction={setSelectedAuction}
          />
        </div>

        {/* Details Panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedAuction ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedAuction.slotCode}
                </h2>
                <p className="text-sm text-gray-400">
                  Auction Time: {new Date(selectedAuction.timestamp).toLocaleTimeString()}
                </p>
                <p className="text-sm text-gray-400">
                  Sizes: {selectedAuction.sizes.map(s => `${s[0]}x${s[1]}`).join(', ') || 'Not specified'}
                </p>
              </div>

              {/* Winning Bid */}
              {selectedAuction.winningBid && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">
                    Winning Bid
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Bidder:</span>
                      <span className="ml-2 text-white">{selectedAuction.winningBid.bidder}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">CPM:</span>
                      <span className="ml-2 text-green-400 font-semibold">
                        ${selectedAuction.winningBid.cpm.toFixed(2)}
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
                </div>
              )}

              {/* All Bids */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">All Bids ({selectedAuction.bids.length})</h3>
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
                      {selectedAuction.bids.map((bid, index) => (
                        <tr
                          key={index}
                          className={`border-t border-gray-700 ${
                            selectedAuction.winningBid?.bidId === bid.bidId
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
              {selectedAuction.winningBid?.ad && (
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
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select an auction to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Panel;
