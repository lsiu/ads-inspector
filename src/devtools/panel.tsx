import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuctionsList from './components/AuctionsList';
import type { Bid, GptInfo, AdSlot } from '../shared/types';

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

const Panel: React.FC = () => {
  // Map<adUnitCode, AuctionEvent[]> — groups auctions by slot
  const [auctionEvents, setAuctionEvents] = useState<Map<string, AuctionEvent[]>>(new Map());
  const [selectedAuction, setSelectedAuction] = useState<AuctionEvent | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const [isDirectoryConfigured, setIsDirectoryConfigured] = useState<boolean>(false);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  // Accumulate slots from an AUCTION_DATA_UPDATE snapshot, grouped by adUnitCode
  const applySnapshot = useCallback((adSlots: AdSlot[]) => {
    const grouped = new Map<string, AuctionEvent[]>();
    adSlots.forEach((slot) => {
      const key = slot.slotCode;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push({
        id: `${slot.slotCode}-${slot.auctionId || 'unknown'}`,
        slotCode: slot.slotCode,
        auctionId: slot.auctionId,
        timestamp: slot.timestamp,
        bids: slot.bids,
        winningBid: slot.winningBid,
        sizes: slot.sizes,
        gpt: slot.gpt,
      });
    });

    // Sort each group by timestamp (newest first)
    grouped.forEach((events) => {
      events.sort((a, b) => b.timestamp - a.timestamp);
    });
    setAuctionEvents(grouped);
  }, []);

  useEffect(() => {
    console.log('[Panel] Connecting to background...');

    // Connect to background service worker
    const connection = chrome.runtime.connect({ name: 'devtools-panel' });
    portRef.current = connection;

    console.log('[Panel] Connected:', connection.name);

    connection.onMessage.addListener((message) => {
      console.log('[Panel] Received message:', message.type);

      if (message.type === 'AUCTION_DATA_UPDATE') {
        console.log('[Panel] Updating auction data, slots:', message.payload.adSlots?.length);

        // Background sends a full snapshot of accumulated slots
        applySnapshot(message.payload.adSlots || []);
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
      portRef.current = null;
    });

    return () => {
      console.log('[Panel] Cleaning up connection');
      connection.disconnect();
    };
  }, [applySnapshot]);

  const handleClearData = () => {
    console.log('[Panel] Clearing data');
    if (portRef.current) {
      portRef.current.postMessage({ type: 'CLEAR_DATA' });
    }
  };

  const handleRefresh = () => {
    console.log('[Panel] Refreshing data');
    if (portRef.current) {
      portRef.current.postMessage({ type: 'GET_DATA' });
    }
  };

  const handleOpenOptions = () => {
    console.log('[Panel] Opening options page');
    if (portRef.current) {
      portRef.current.postMessage({ type: 'OPEN_OPTIONS' });
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
