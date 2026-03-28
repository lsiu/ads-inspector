// Storage module - handles persistence to file system

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

interface AuctionDataWithMeta extends AdAuctionData {
  savedAt: number;
}

interface StorageResult {
  storagePath?: string;
  auctionData?: AuctionDataWithMeta[];
}

// Write auction data to file
export const writeAuctionData = async (_data: AdAuctionData): Promise<void> => {
  try {
    // Use chrome.storage to persist data (more reliable than file system in extensions)
    // File system access requires additional permissions and user interaction
    chrome.storage.local.get(['auctionData'], (result: StorageResult) => {
      const allData: AuctionDataWithMeta[] = result.auctionData || [];
      allData.push({
        ..._data,
        savedAt: Date.now(),
      });
      
      // Keep only last 1000 records to prevent storage overflow
      const trimmedData = allData.slice(-1000);
      
      chrome.storage.local.set({ auctionData: trimmedData });
    });
    
    console.log('[Ad Inspector] Data persisted to storage');
  } catch (error) {
    console.error('[Ad Inspector] Error writing data:', error);
  }
};

// Export data as JSON file (triggered by user)
export const exportData = async (): Promise<void> => {
  try {
    chrome.storage.local.get(['auctionData'], (result: StorageResult) => {
      const data = result.auctionData || [];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url,
        filename: `ad-auction-data-${Date.now()}.json`,
        saveAs: true,
      });
    });
  } catch (error) {
    console.error('[Ad Inspector] Error exporting data:', error);
  }
};
