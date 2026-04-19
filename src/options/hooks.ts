import { useCallback, useEffect, useState } from 'react';
import type { SectionStatus } from './types';

interface UseStorageSyncResult<T> {
  value: T;
  setValue: (value: T) => void;
  save: () => Promise<void>;
  status: SectionStatus;
  error: string;
}

/**
 * Custom hook for managing chrome.storage.sync with typed values
 * @param key - The storage key
 * @param defaultValue - Default value if not found in storage
 * @param onSave - Optional callback after successful save
 * @returns Object with value, setValue, save function, and status/error
 */
export function useStorageSync<T>(
  key: string,
  defaultValue: T,
  onSave?: () => void
): UseStorageSyncResult<T> {
  const [value, setValue] = useState<T>(defaultValue);
  const [status, setStatus] = useState<SectionStatus>('idle');
  const [error, setError] = useState<string>('');

  // Load from storage on mount
  useEffect(() => {
    chrome.storage.sync.get(key, (result) => {
      if (result && result[key] !== undefined && result[key] !== null) {
        setValue(result[key] as T);
      } else {
        setValue(defaultValue);
      }
    });
  }, [key, defaultValue]);

  // Save to storage
  const save = useCallback(async () => {
    return new Promise<void>((resolve) => {
      setStatus('idle');
      setError('');

      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message || 'Failed to save');
          setStatus('error');
        } else {
          setStatus('saved');
          onSave?.();
          // Reset status after 2 seconds
          setTimeout(() => setStatus('idle'), 2000);
        }
        resolve();
      });
    });
  }, [key, value, onSave]);

  return {
    value,
    setValue,
    save,
    status,
    error,
  };
}
