// Storage module - handles persistence to file system using IndexedDB for handle storage

import { getDirectoryInfo, storeDirectoryHandle, clearDirectoryHandle } from '../shared/idb';

/** A complete auction file written to disk */
export interface AuctionFile {
  pageUrl: string;
  auctionId: string;
  timestamp: number;
  events: { type: string; timestamp: number; data: Record<string, unknown> }[];
  savedAt: number;
}

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
    const { handle, name } = await getDirectoryInfo();

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
  // Lazy initialization — nothing to do here
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

// Refresh the in-memory cache from IndexedDB (called when directory is updated externally)
export const refreshDirectoryCache = async (): Promise<void> => {
  // Reset in-memory cache
  directoryHandle = null;
  directoryName = null;
  // Reload from IndexedDB
  await ensureInitialized();
  console.log('[Ad Inspector] Directory cache refreshed:', directoryName || 'none');
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

// Build a per-auction filename: auction-YYYYMMDD-HHmmss-<auctionId>.json
const getAuctionFilename = (timestamp: number, auctionId: string): string => {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  // Truncate auctionId to keep filenames reasonable
  const shortId = auctionId.length > 12 ? auctionId.slice(0, 12) : auctionId;
  return `auction-${year}${month}${day}-${hour}${min}${sec}-${shortId}.json`;
};

// Write a complete auction file to disk (one JSON file per auction)
export const writeAuctionFile = async (data: AuctionFile): Promise<void> => {
  // Ensure initialized before checking handle
  await ensureInitialized();

  if (!directoryHandle) {
    return;
  }

  try {
    const filename = getAuctionFilename(data.timestamp, data.auctionId);
    const writable = await directoryHandle.getFileHandle(filename, { create: true });
    const stream = await writable.createWritable();
    await stream.write(JSON.stringify(data, null, 2));
    await stream.close();

    console.log('[Ad Inspector] Auction written to:', filename);
  } catch (error: any) {
    console.error('[Ad Inspector] Error writing auction file:', error);
  }
};

// Clear the stored directory configuration
export const clearDirectoryConfig = async (): Promise<void> => {
  directoryHandle = null;
  directoryName = null;
  await clearDirectoryHandle();
  console.log('[Ad Inspector] Directory configuration cleared');
};
