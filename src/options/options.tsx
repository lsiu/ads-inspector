import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// Shared utilities
import { getDirectoryName } from '../shared/idb';
import type { SourceDetectionConfig } from '../shared/types';

// Local imports
import { STORAGE_KEYS } from './constants';
import type { OptionsState, SectionStatus } from './types';
import { INITIAL_OPTIONS_STATE } from './types';
import {
  StorageDirectorySection,
  HighlightedBidderSection,
  SourceDetectionSection,
} from './sections';

const Options: React.FC = () => {
  const [state, setState] = useState<OptionsState>(INITIAL_OPTIONS_STATE);

  // Load initial data from storage
  useEffect(() => {
    // Load directory name from IndexedDB
    getDirectoryName().then((name) => {
      if (name) {
        setState((prev) => ({ ...prev, directoryName: name }));
      }
    });

    // Load highlighted bidder from chrome.storage.sync
    chrome.storage.sync.get(STORAGE_KEYS.HIGHLIGHTED_BIDDER, (result) => {
      if (result[STORAGE_KEYS.HIGHLIGHTED_BIDDER]) {
        setState((prev) => ({
          ...prev,
          highlightedBidder: result[STORAGE_KEYS.HIGHLIGHTED_BIDDER] as string,
        }));
      }
    });

    // Load source detection config from chrome.storage.sync
    chrome.storage.sync.get(STORAGE_KEYS.SOURCE_DETECTION_CONFIG, (result) => {
      if (result[STORAGE_KEYS.SOURCE_DETECTION_CONFIG]) {
        setState((prev) => ({
          ...prev,
          sourceDetection: result[STORAGE_KEYS.SOURCE_DETECTION_CONFIG] as SourceDetectionConfig,
        }));
      }
    });
  }, []);

  // State update helpers
  const updateState = (updates: Partial<OptionsState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const setSectionStatus = (section: keyof Pick<OptionsState, 'directoryStatus' | 'bidderStatus' | 'sourceDetectionStatus'>, status: SectionStatus) => {
    updateState({ [section]: status });
  };

  // Highlighted Bidder handlers
  const handleSaveHighlightedBidder = async () => {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEYS.HIGHLIGHTED_BIDDER]: state.highlightedBidder.trim() }, () => {
        setSectionStatus('bidderStatus', 'saved');
        setTimeout(() => setSectionStatus('bidderStatus', 'idle'), 2000);
        resolve();
      });
    });
  };

  const handleClearHighlightedBidder = () => {
    updateState({ highlightedBidder: '' });
    chrome.storage.sync.set({ [STORAGE_KEYS.HIGHLIGHTED_BIDDER]: '' });
  };

  // Source Detection handlers
  const handleSaveSourceDetection = () => {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEYS.SOURCE_DETECTION_CONFIG]: state.sourceDetection }, () => {
        setSectionStatus('sourceDetectionStatus', 'saved');
        setTimeout(() => setSectionStatus('sourceDetectionStatus', 'idle'), 2000);
        resolve();
      });
    });
  };

  // Directory handlers
  const handleDirectoryNameChange = (name: string) => {
    updateState({ directoryName: name });
  };

  const handleDirectoryStatusChange = (status: SectionStatus) => {
    setSectionStatus('directoryStatus', status);
  };

  const handleDirectoryErrorChange = (error: string) => {
    updateState({ directoryError: error });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Ad Auction Inspector Settings</h1>

        <StorageDirectorySection
          directoryName={state.directoryName}
          status={state.directoryStatus}
          error={state.directoryError}
          onDirectoryNameChange={handleDirectoryNameChange}
          onStatusChange={handleDirectoryStatusChange}
          onErrorChange={handleDirectoryErrorChange}
        />

        <HighlightedBidderSection
          bidder={state.highlightedBidder}
          status={state.bidderStatus}
          onBidderChange={(bidder) => updateState({ highlightedBidder: bidder })}
          onSave={handleSaveHighlightedBidder}
          onClear={handleClearHighlightedBidder}
        />

        <SourceDetectionSection
          config={state.sourceDetection}
          status={state.sourceDetectionStatus}
          onConfigChange={(config) => updateState({ sourceDetection: config })}
          onSave={handleSaveSourceDetection}
        />
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
