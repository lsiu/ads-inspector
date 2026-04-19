import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import shared IndexedDB helpers
import { storeDirectoryHandle, getDirectoryName, clearDirectoryHandle } from '../shared/idb';
import type { SourceDetectionConfig } from '../shared/types';

const Options: React.FC = () => {
  const [directoryName, setDirectoryName] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [highlightedBidder, setHighlightedBidder] = useState<string>('');
  const [bidderSaveStatus, setBidderSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [sourceDetection, setSourceDetection] = useState<SourceDetectionConfig>({
    adMarkupPattern: 'adsrvr.org/bid/feedback',
    attributedBidder: 'ttd',
    enabled: true,
  });
  const [sourceDetectionStatus, setSourceDetectionStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    // Load directory name from IndexedDB
    getDirectoryName().then((name) => {
      if (name) {
        setDirectoryName(name);
      }
    });
    // Load highlighted bidder from chrome.storage.sync
    chrome.storage.sync.get('highlightedBidder', (result) => {
      if (result.highlightedBidder) {
        setHighlightedBidder(result.highlightedBidder);
      }
    });
    // Load source detection config from chrome.storage.sync
    chrome.storage.sync.get('sourceDetectionConfig', (result) => {
      if (result.sourceDetectionConfig) {
        setSourceDetection(result.sourceDetectionConfig);
      }
    });
  }, []);

  const handleSaveHighlightedBidder = () => {
    chrome.storage.sync.set({ highlightedBidder: highlightedBidder.trim() }, () => {
      setBidderSaveStatus('saved');
      setTimeout(() => setBidderSaveStatus('idle'), 2000);
    });
  };

  const handleSaveSourceDetection = () => {
    chrome.storage.sync.set({ sourceDetectionConfig: sourceDetection }, () => {
      setSourceDetectionStatus('saved');
      setTimeout(() => setSourceDetectionStatus('idle'), 2000);
    });
  };

  const handleSelectDirectory = async () => {
    try {
      setStatus('idle');
      setErrorMessage('');

      // Use File System Access API to prompt user for directory
      const dirHandle = await (window as any).showDirectoryPicker();

      // Verify we have read/write permission
      const permission = await (dirHandle as any).queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        const requestResult = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
        if (requestResult !== 'granted') {
          throw new Error('Permission denied for directory access');
        }
      }

      // Store the handle directly in IndexedDB (this is the ONLY way to persist handles)
      await storeDirectoryHandle(dirHandle, dirHandle.name);

      setDirectoryName(dirHandle.name);
      setStatus('success');

      // Notify background script to reload the handle from IndexedDB
      chrome.runtime.sendMessage({ type: 'DIRECTORY_HANDLE_STORED' });
    } catch (error: any) {
      console.error('[Ad Inspector] Error selecting directory:', error);
      setErrorMessage(error.message || 'Failed to select directory');
      setStatus('error');
    }
  };

  const handleClearDirectory = async () => {
    try {
      await clearDirectoryHandle();
      setDirectoryName('');
      setStatus('idle');
      setErrorMessage('');

      // Notify background script to clear the handle
      chrome.runtime.sendMessage({ type: 'DIRECTORY_HANDLE_CLEARED' });
    } catch (error: any) {
      console.error('[Ad Inspector] Error clearing directory:', error);
      setErrorMessage(error.message || 'Failed to clear directory');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Ad Auction Inspector Settings</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Storage Directory</h2>
          <p className="text-gray-400 mb-4">
            Select a directory where auction data will be saved. Data is written hourly to files
            named <code className="bg-gray-700 px-2 py-1 rounded">auctions-YYYYMMDD-HHmmss-&lt;auction_id&gt;.json</code>.
          </p>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 bg-gray-700 rounded-lg p-4">
              {directoryName ? (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Current directory:</p>
                  <p className="text-lg font-mono text-green-400">{directoryName}</p>
                </div>
              ) : (
                <p className="text-yellow-400">No directory selected. Auction data will not be saved.</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSelectDirectory}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Select Directory
            </button>
            {directoryName && (
              <button
                onClick={handleClearDirectory}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Clear Selection
              </button>
            )}
          </div>

          {status === 'success' && (
            <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-400">Directory configured successfully!</p>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
              <p className="text-red-400">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Highlighted Bidder</h2>
          <p className="text-gray-400 mb-4">
            Enter a bidder key to highlight in the auction list. When this bidder participates in an auction, their name will be shown next to the bid count.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={highlightedBidder}
              onChange={(e) => setHighlightedBidder(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveHighlightedBidder()}
              placeholder="e.g. ttd, appnexus"
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveHighlightedBidder}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save
            </button>
            {highlightedBidder && (
              <button
                onClick={() => {
                  setHighlightedBidder('');
                  chrome.storage.sync.set({ highlightedBidder: '' });
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {bidderSaveStatus === 'saved' && (
            <div className="mt-3 p-3 bg-green-900/30 border border-green-700 rounded-lg">
              <p className="text-green-400">Highlighted bidder saved!</p>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Source Detection</h2>
          <p className="text-gray-400 mb-4">
            Configure automatic detection of ad sources by pattern matching. When an ad markup contains the specified pattern and the bidder is different from the attributed bidder, a source label will be shown.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Enable Source Detection</label>
              <input
                type="checkbox"
                checked={sourceDetection.enabled}
                onChange={(e) => setSourceDetection({ ...sourceDetection, enabled: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Ad Markup Pattern (text to search for)</label>
              <input
                type="text"
                value={sourceDetection.adMarkupPattern}
                onChange={(e) => setSourceDetection({ ...sourceDetection, adMarkupPattern: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSourceDetection()}
                placeholder="e.g. adsrvr.org/bid/feedback"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">The text to look for in ad markup</p>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Attributed Bidder</label>
              <input
                type="text"
                value={sourceDetection.attributedBidder}
                onChange={(e) => setSourceDetection({ ...sourceDetection, attributedBidder: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveSourceDetection()}
                placeholder="e.g. ttd"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">The bidder name to attribute when pattern is detected</p>
            </div>
            <button
              onClick={handleSaveSourceDetection}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save Source Detection Config
            </button>
            {sourceDetectionStatus === 'saved' && (
              <div className="p-3 bg-green-900/30 border border-green-700 rounded-lg">
                <p className="text-green-400">Source detection config saved!</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Data Format</h2>
          <div className="text-gray-400 space-y-2">
            <p>Auction data is written in NDJSON format (one JSON object per line):</p>
            <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
{`{"pageUrl":"https://example.com","timestamp":1711728000000,"adSlots":[...],"savedAt":1711728000000}
{"pageUrl":"https://example.com","timestamp":1711728060000,"adSlots":[...],"savedAt":1711728060000}`}
            </pre>
            <p className="mt-2">
              Files are rotated hourly. Each file contains all auction events for that hour.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <Options />
    </React.StrictMode>
  );
}
