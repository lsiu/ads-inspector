import React from 'react';
import { STORAGE_KEYS, BUTTON_CLASSES, SECTION_CLASSES, STATUS_CLASSES } from '../constants';
import type { SectionStatus } from '../types';
import { storeDirectoryHandle, clearDirectoryHandle } from '../../shared/idb';

interface StorageDirectorySectionProps {
  directoryName: string;
  status: SectionStatus;
  error: string;
  onDirectoryNameChange: (name: string) => void;
  onStatusChange: (status: SectionStatus) => void;
  onErrorChange: (error: string) => void;
}

export const StorageDirectorySection: React.FC<StorageDirectorySectionProps> = ({
  directoryName,
  status,
  error,
  onDirectoryNameChange,
  onStatusChange,
  onErrorChange,
}) => {
  const handleSelectDirectory = async () => {
    try {
      onStatusChange('idle');
      onErrorChange('');

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

      // Store the handle directly in IndexedDB
      await storeDirectoryHandle(dirHandle, dirHandle.name);

      onDirectoryNameChange(dirHandle.name);
      onStatusChange('success');

      // Notify background script to reload the handle from IndexedDB
      chrome.runtime.sendMessage({ type: 'DIRECTORY_HANDLE_STORED' });
    } catch (error: any) {
      console.error('[Ad Inspector] Error selecting directory:', error);
      onErrorChange(error.message || 'Failed to select directory');
      onStatusChange('error');
    }
  };

  const handleClearDirectory = async () => {
    try {
      await clearDirectoryHandle();
      onDirectoryNameChange('');
      onStatusChange('idle');
      onErrorChange('');

      // Notify background script to clear the handle
      chrome.runtime.sendMessage({ type: 'DIRECTORY_HANDLE_CLEARED' });
    } catch (error: any) {
      console.error('[Ad Inspector] Error clearing directory:', error);
      onErrorChange(error.message || 'Failed to clear directory');
      onStatusChange('error');
    }
  };

  return (
    <div className={SECTION_CLASSES.CONTAINER}>
      <h2 className={SECTION_CLASSES.TITLE}>Storage Directory</h2>
      <p className={SECTION_CLASSES.TEXT}>
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
            <p className={STATUS_CLASSES.WARNING_TEXT}>No directory selected. Auction data will not be saved.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSelectDirectory}
          className={BUTTON_CLASSES.PRIMARY}
        >
          Select Directory
        </button>
        {directoryName && (
          <button
            onClick={handleClearDirectory}
            className={BUTTON_CLASSES.SECONDARY}
          >
            Clear Selection
          </button>
        )}
      </div>

      {status === 'success' && (
        <div className={`mt-4 ${STATUS_CLASSES.SUCCESS}`}>
          <p className={STATUS_CLASSES.SUCCESS_TEXT}>Directory configured successfully!</p>
        </div>
      )}

      {status === 'error' && (
        <div className={`mt-4 ${STATUS_CLASSES.ERROR}`}>
          <p className={STATUS_CLASSES.ERROR_TEXT}>{error}</p>
        </div>
      )}
    </div>
  );
};
