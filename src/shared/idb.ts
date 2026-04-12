// Shared IndexedDB helper for storing FileSystemHandle objects
// Can be used in both extension background and options page contexts

export const DB_NAME = 'ad-auction-inspector';
export const DB_VERSION = 1;
export const STORE_NAME = 'storage';

// Open database
export const openDB = (): Promise<IDBDatabase> => {
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

// Get directory handle and name from IndexedDB in a single transaction
export const getDirectoryInfo = async (): Promise<{
  handle: FileSystemDirectoryHandle | null;
  name: string | null;
}> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const handleRequest = store.get('directoryHandle');
    const nameRequest = store.get('directoryName');

    // Wait for both requests to complete
    let handleResult: FileSystemDirectoryHandle | null = null;
    let nameResult: string | null = null;
    let completed = 0;

    const checkComplete = () => {
      completed++;
      if (completed === 2) {
        resolve({ handle: handleResult, name: nameResult });
      }
    };

    handleRequest.onsuccess = () => {
      handleResult = handleRequest.result || null;
      checkComplete();
    };
    handleRequest.onerror = () => reject(handleRequest.error);

    nameRequest.onsuccess = () => {
      nameResult = nameRequest.result || null;
      checkComplete();
    };
    nameRequest.onerror = () => reject(nameRequest.error);
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
