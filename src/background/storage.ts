// Storage module - handles persistence to file system using File System Access API

interface AdAuctionData {
  pageUrl: string;
  timestamp: number;
  adSlots: AdSlot[];
}

interface AdSlot {
  slotCode: string;
  divId: string;
  sizes: number[][];
  bids: Bid[];
  winningBid?: Bid;
}

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

interface StorageResult {
  storageDirectoryHandle?: FileSystemDirectoryHandle;
  storageDirectoryPath?: string;
}

// Cached directory handle
let directoryHandle: FileSystemDirectoryHandle | null = null;
let directoryPath: string | null = null;

// Initialize storage - restore directory handle from storage
export const initStorage = async (): Promise<void> => {
  try {
    const result: StorageResult = await chrome.storage.local.get([
      'storageDirectoryHandle',
      'storageDirectoryPath',
    ]);
    
    if (result.storageDirectoryHandle) {
      // Try to restore the handle
      try {
        // Verify the handle is still valid by getting its name
        const name = await result.storageDirectoryHandle.name;
        directoryHandle = result.storageDirectoryHandle;
        directoryPath = result.storageDirectoryPath || name;
        console.log('[Ad Inspector] Storage initialized:', directoryPath);
      } catch (error) {
        console.log('[Ad Inspector] Stored handle is invalid, will prompt user');
        directoryHandle = null;
        directoryPath = null;
      }
    }
  } catch (error) {
    console.error('[Ad Inspector] Error initializing storage:', error);
  }
};

// Check if directory is configured
export const isDirectoryConfigured = (): boolean => {
  return directoryHandle !== null;
};

// Get the current directory path
export const getDirectoryPath = (): string | null => {
  return directoryPath;
};

// Request directory from user - called from options page or on first auction
export const requestDirectory = async (): Promise<boolean> => {
  try {
    // Use File System Access API to prompt user for directory
    const dirHandle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker();
    
    // Verify we have read/write permission
    const permission = await (dirHandle as any).queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      const requestResult = await (dirHandle as any).requestPermission({ mode: 'readwrite' });
      if (requestResult !== 'granted') {
        throw new Error('Permission denied for directory access');
      }
    }

    // Store the directory handle for later use
    await chrome.storage.local.set({
      storageDirectoryHandle: dirHandle,
      storageDirectoryPath: dirHandle.name,
    });

    directoryHandle = dirHandle;
    directoryPath = dirHandle.name;

    console.log('[Ad Inspector] Directory configured:', directoryPath);
    return true;
  } catch (error: any) {
    console.error('[Ad Inspector] Error requesting directory:', error);
    return false;
  }
};

// Get the filename for the current hour
const getHourlyFilename = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  
  return `auctions-${year}-${month}-${day}-${hour}.json`;
};

// Write auction data to file
export const writeAuctionData = async (data: AdAuctionData): Promise<void> => {
  // If no directory is configured, skip silently
  if (!directoryHandle) {
    return;
  }

  try {
    const filename = getHourlyFilename();
    
    // Prepare the data line (NDJSON format - one JSON object per line)
    const dataLine = JSON.stringify({
      ...data,
      savedAt: Date.now(),
    }) + '\n';

    // Try to get the existing file
    let fileHandle: FileSystemFileHandle;
    try {
      fileHandle = await directoryHandle.getFileHandle(filename);
    } catch (error) {
      // File doesn't exist, create it
      fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    }

    // Create a writable stream
    const writable = await fileHandle.createWritable();
    
    // Append data to the file
    await writable.write(dataLine);
    
    // Close the stream
    await writable.close();
    
    console.log('[Ad Inspector] Data written to:', filename);
  } catch (error: any) {
    console.error('[Ad Inspector] Error writing data:', error);
    
    // If we get a security error, the handle might be stale
    if (error.name === 'SecurityError' || error.name === 'NotFoundError') {
      console.log('[Ad Inspector] Directory handle is stale, clearing...');
      directoryHandle = null;
      directoryPath = null;
      await chrome.storage.local.remove(['storageDirectoryHandle', 'storageDirectoryPath']);
    }
  }
};

// Export all data as a downloadable JSON file
export const exportData = async (): Promise<void> => {
  try {
    // For now, just use chrome.storage as we don't have a read implementation
    const result = await chrome.storage.local.get(['auctionData']);
    const data = result.auctionData || [];
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url,
      filename: `ad-auction-export-${Date.now()}.json`,
      saveAs: true,
    });
    
    console.log('[Ad Inspector] Data exported');
  } catch (error: any) {
    console.error('[Ad Inspector] Error exporting data:', error);
  }
};

// Clear the stored directory configuration
export const clearDirectoryConfig = async (): Promise<void> => {
  directoryHandle = null;
  directoryPath = null;

  await chrome.storage.local.remove(['storageDirectoryHandle', 'storageDirectoryPath']);
  console.log('[Ad Inspector] Directory configuration cleared');
};
