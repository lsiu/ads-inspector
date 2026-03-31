import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Import shared IndexedDB helpers
import { storeDirectoryHandle, getDirectoryName, clearDirectoryHandle } from '../shared/idb';

const Options: React.FC = () => {
  const [directoryName, setDirectoryName] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Load directory name from IndexedDB
    getDirectoryName().then((name) => {
      if (name) {
        setDirectoryName(name);
      }
    });
  }, []);

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
            named <code className="bg-gray-700 px-2 py-1 rounded">auctions-YYYY-MM-DD-HH.json</code>.
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
