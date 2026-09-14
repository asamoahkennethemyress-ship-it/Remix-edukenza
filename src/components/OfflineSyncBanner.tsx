import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { flushOfflineQueue, getPendingCbtAttempts, getPendingWalletTxns } from '../services/offlineSyncService';

export const OfflineSyncBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCbtCount, setPendingCbtCount] = useState(0);
  const [pendingWalletCount, setPendingWalletCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedNotification, setSyncedNotification] = useState<string | null>(null);

  useEffect(() => {
    const checkPending = async () => {
      const cbt = await getPendingCbtAttempts();
      const wallet = await getPendingWalletTxns();
      setPendingCbtCount(cbt.length);
      setPendingWalletCount(wallet.length);
    };

    checkPending();

    const handleOnline = async () => {
      setIsOffline(false);
      setIsSyncing(true);
      const res = await flushOfflineQueue();
      setIsSyncing(false);
      await checkPending();
      if (res.syncedCbt > 0 || res.syncedWallet > 0) {
        setSyncedNotification(`Auto-synced ${res.syncedCbt} CBT exam attempt(s) & ${res.syncedWallet} wallet transaction(s) to Firestore!`);
        setTimeout(() => setSyncedNotification(null), 6000);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      checkPending();
    };

    const handleSyncEvent = (e: any) => {
      const detail = e.detail;
      checkPending();
      if (detail && (detail.syncedCbt > 0 || detail.syncedWallet > 0)) {
        setSyncedNotification(`Background Sync complete: ${detail.syncedCbt} CBT attempt(s), ${detail.syncedWallet} wallet txn(s) saved to Firestore!`);
        setTimeout(() => setSyncedNotification(null), 6000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('edukenza-offline-synced', handleSyncEvent);

    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('edukenza-offline-synced', handleSyncEvent);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await flushOfflineQueue();
    setIsSyncing(false);
    const cbt = await getPendingCbtAttempts();
    const wallet = await getPendingWalletTxns();
    setPendingCbtCount(cbt.length);
    setPendingWalletCount(wallet.length);

    if (res.syncedCbt > 0 || res.syncedWallet > 0) {
      setSyncedNotification(`Synced ${res.syncedCbt} CBT attempt(s) and ${res.syncedWallet} wallet transaction(s)!`);
      setTimeout(() => setSyncedNotification(null), 5000);
    }
  };

  const totalPending = pendingCbtCount + pendingWalletCount;

  if (!isOffline && totalPending === 0 && !syncedNotification && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-none">
      <div className="pointer-events-auto shadow-2xl rounded-2xl border transition-all duration-300">
        {/* Offline Warning Banner */}
        {isOffline && (
          <div className="bg-amber-900/95 border-amber-500/60 text-amber-100 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <span className="font-black text-amber-200 block">Offline Mode Active (Service Worker Engine)</span>
                <span className="text-[11px] opacity-90">
                  CBT answers & wallet requests are stored locally in IndexedDB.
                </span>
              </div>
            </div>
            {totalPending > 0 && (
              <span className="px-2.5 py-1 bg-amber-500/30 rounded-full font-bold text-amber-300 text-[10px]">
                {totalPending} queued
              </span>
            )}
          </div>
        )}

        {/* Sync Success Notification */}
        {!isOffline && syncedNotification && (
          <div className="bg-emerald-950/95 border-emerald-500/60 text-emerald-100 p-3 rounded-2xl flex items-center gap-2 text-xs shadow-lg animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-200">{syncedNotification}</span>
          </div>
        )}

        {/* Syncing or Pending Queue Indicator */}
        {!isOffline && totalPending > 0 && !syncedNotification && (
          <div className="bg-blue-950/95 border-blue-500/60 text-blue-100 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span>
                <strong className="text-white">{totalPending}</strong> offline item(s) waiting for sync ({pendingCbtCount} CBT, {pendingWalletCount} Txns)
              </span>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 transition text-[11px] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
