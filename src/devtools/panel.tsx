import React, { useState, useEffect, useCallback, useRef } from 'react';
import AuctionsList from './components/AuctionsList';
import AuctionDetailsPanel from './components/AuctionDetailsPanel';
import type { AdSlot } from '../shared/types';

const Panel: React.FC = () => {
  // Map<adUnitCode, AdSlot[]> — groups auctions by slot
  const [auctionEvents, setAuctionEvents] = useState<Map<string, AdSlot[]>>(new Map());
  const [selectedAuction, setSelectedAuction] = useState<AdSlot | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const [isDirectoryConfigured, setIsDirectoryConfigured] = useState<boolean>(false);
  const [directoryName, setDirectoryName] = useState<string | null>(null);

  // Accumulate slots from an AUCTION_DATA_UPDATE snapshot, grouped by adUnitCode
  const applySnapshot = useCallback((adSlots: AdSlot[]) => {
    const grouped = new Map<string, AdSlot[]>();
    adSlots.forEach((slot) => {
      const key = slot.slotCode;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(slot);
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

    connection.postMessage({ type: 'INIT', tabId: chrome.devtools.inspectedWindow.tabId });

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
          <AuctionDetailsPanel selectedAuction={selectedAuction} />
        </div>
      </div>
    </div>
  );
};

export default Panel;
