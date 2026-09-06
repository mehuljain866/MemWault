import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getScrapeStatus, triggerScrape } from '../services/api';

const SyncContext = createContext({
  isSyncing: false,
  syncLog: null,
  lastLog: null,
  triggerSync: async () => {},
  checkStatus: async () => false,
});

export function SyncProvider({ children }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState(null);
  const [lastLog, setLastLog] = useState(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    isSyncingRef.current = isSyncing;
  }, [isSyncing]);

  const checkStatus = useCallback(async () => {
    try {
      const res = await getScrapeStatus();
      if (res && res.is_syncing) {
        setIsSyncing(true);
        setSyncLog(res.log || null);
        return true;
      } else {
        if (isSyncingRef.current) {
          // Just completed in background!
          setIsSyncing(false);
          setSyncLog(null);
          setLastLog(res?.last_log || null);
          window.dispatchEvent(new CustomEvent('memwault-sync-finished', { detail: res?.last_log }));
        }
        return false;
      }
    } catch (err) {
      console.warn('Sync status check warning:', err);
      return false;
    }
  }, []);

  // Adaptive polling: fast (1.5s) while syncing, idle check (5s) when idle
  useEffect(() => {
    // Initial check immediately on mount
    checkStatus();

    const intervalMs = isSyncing ? 1500 : 5000;
    const timer = setInterval(() => {
      checkStatus();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSyncing, checkStatus]);

  const triggerSync = useCallback(
    async (force = true) => {
      if (isSyncingRef.current) {
        throw new Error('A sync job is already actively running. Please wait for it to finish.');
      }

      setIsSyncing(true);
      try {
        const res = await triggerScrape(force);
        // Immediately query status
        setTimeout(() => checkStatus(), 200);
        return res;
      } catch (err) {
        setIsSyncing(false);
        throw err;
      }
    },
    [checkStatus]
  );

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        syncLog,
        lastLog,
        triggerSync,
        checkStatus,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    return {
      isSyncing: false,
      syncLog: null,
      lastLog: null,
      triggerSync: async () => {},
      checkStatus: async () => false,
    };
  }
  return context;
}
