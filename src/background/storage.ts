// Storage module - handles persistence to file system using IndexedDB for handle storage

import { getDirectoryHandle, getDirectoryName as getIdbName, storeDirectoryHandle, clearDirectoryHandle } from './idb';

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

// NDJSON event line — any event from the auction pipeline
interface AuctionEvent {
  pageUrl: string;
  timestamp: number;
  type: string;
  data: Record<string, unknown>;
  savedAt?: number;
}

// Legacy format (kept for backward compat with any existing files)
interface LegacyAuctionData {
  pageUrl: string;
  timestamp: number;
  adSlots: AdSlot[];
  savedAt?: number;
}

type WritableData = AuctionEvent | LegacyAuctionData;

// In-memory directory handle (retrieved from IndexedDB lazily)
let directoryHandle: FileSystemDirectoryHandle | null = null;
let directoryName: string | null = null;
let isLoading = false;

// Lazy initialization - load handle from IndexedDB on first access
const ensureInitialized = async (): Promise<void> => {
  if (isLoading || directoryHandle !== null) {
    return;
  }
  
  isLoading = true;
  
  try {
    const handle = await getDirectoryHandle();
    const name = await getIdbName();

    if (handle) {
      directoryHandle = handle;
      directoryName = name || handle.name;
      console.log('[Ad Inspector] Storage initialized from IndexedDB:', directoryName);
    } else {
      console.log('[Ad Inspector] No directory configured');
    }
  } catch (error) {
    console.error('[Ad Inspector] Error initializing storage:', error);
  } finally {
    isLoading = false;
  }
};

// Initialize storage (for backward compatibility, but does nothing now)
export const initStorage = async (): Promise<void> => {
  // Lazy initialization - nothing to do here
  console.log('[Ad Inspector] Storage module ready (lazy initialization enabled)');
};

// Set directory handle - store in IndexedDB and memory
export const setDirectoryHandle = async (handle: FileSystemDirectoryHandle, name: string): Promise<void> => {
  try {
    await storeDirectoryHandle(handle, name);
    directoryHandle = handle;
    directoryName = name;
    console.log('[Ad Inspector] Directory handle set:', name);
  } catch (error) {
    console.error('[Ad Inspector] Error storing directory handle:', error);
  }
};

// Check if directory is configured (triggers lazy initialization)
export const isDirectoryConfigured = async (): Promise<boolean> => {
  if (directoryHandle !== null) {
    return true;
  }
  await ensureInitialized();
  return directoryHandle !== null;
};

// Get the current directory name (triggers lazy initialization)
export const getDirectoryName = async (): Promise<string | null> => {
  if (directoryName !== null) {
    return directoryName;
  }
  await ensureInitialized();
  return directoryName;
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

// Write auction data to file (NDJSON — one event per line)
export const writeAuctionData = async (data: WritableData): Promise<void> => {
  // Ensure initialized before checking handle
  await ensureInitialized();

  if (!directoryHandle) {
    return;
  }

  try {
    const filename = getHourlyFilename();
    const dataLine = JSON.stringify({ ...data, savedAt: Date.now() }) + '\n';

    let fileHandle: FileSystemFileHandle;
    try {
      // Try to get the existing file
      fileHandle = await directoryHandle.getFileHandle(filename);
    } catch (error) {
      // File doesn't exist, create it
      fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    }

    // Read existing content first
    let existingContent = '';
    try {
      const file = await fileHandle.getFile();
      existingContent = await file.text();
    } catch (error) {
      // File is empty or unreadable, start fresh
      existingContent = '';
    }

    // Append new data and write back
    const writable = await fileHandle.createWritable();
    await writable.write(existingContent + dataLine);
    await writable.close();

    console.log('[Ad Inspector] Data written to:', filename);
  } catch (error: any) {
    console.error('[Ad Inspector] Error writing data:', error);
  }
};

// Clear the stored directory configuration
export const clearDirectoryConfig = async (): Promise<void> => {
  directoryHandle = null;
  directoryName = null;
  await clearDirectoryHandle();
  console.log('[Ad Inspector] Directory configuration cleared');
};
