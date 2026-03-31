// IndexedDB helper for storing FileSystemHandle objects

const DB_NAME = 'ad-auction-inspector';
const DB_VERSION = 1;
const STORE_NAME = 'storage';

// Open database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

// Store directory handle in IndexedDB
export const storeDirectoryHandle = async (handle: FileSystemDirectoryHandle, name: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const putRequest = store.put(handle, 'directoryHandle');
    putRequest.onsuccess = () => {
      // Also store the name separately for quick access
      store.put(name, 'directoryName');
      resolve();
    };
    putRequest.onerror = () => reject(putRequest.error);
  });
};

// Get directory handle from IndexedDB
export const getDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get('directoryHandle');
    getRequest.onsuccess = () => resolve(getRequest.result || null);
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Get directory name from IndexedDB
export const getDirectoryName = async (): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    const getRequest = store.get('directoryName');
    getRequest.onsuccess = () => resolve(getRequest.result || null);
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Clear directory handle from IndexedDB
export const clearDirectoryHandle = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const deleteRequest1 = store.delete('directoryHandle');
    const deleteRequest2 = store.delete('directoryName');
    
    deleteRequest1.onsuccess = () => {
      deleteRequest2.onsuccess = () => resolve();
    };
    deleteRequest1.onerror = () => reject(deleteRequest1.error);
  });
};
