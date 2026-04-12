// Re-export shared IndexedDB helpers for background script
export {
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  openDB,
  storeDirectoryHandle,
  getDirectoryHandle,
  getDirectoryName,
  getDirectoryInfo,
  clearDirectoryHandle
} from '../shared/idb';
