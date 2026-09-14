import { collection, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

const DB_NAME = 'edukenza_offline_sync_db';
const DB_VERSION = 1;
const CBT_STORE = 'cbt_queue';
const WALLET_STORE = 'wallet_queue';

export interface PendingCbtQueueItem {
  id: string;
  attemptData: any;
  timestamp: string;
}

export interface PendingWalletQueueItem {
  id: string;
  txnData: any;
  timestamp: string;
}

// Helper to open IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CBT_STORE)) {
        db.createObjectStore(CBT_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(WALLET_STORE)) {
        db.createObjectStore(WALLET_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueue a CBT Exam Attempt to IndexedDB for Service Worker Background Sync
 */
export async function enqueueCbtAttempt(attemptData: any): Promise<string> {
  const queueId = `cbt_offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: PendingCbtQueueItem = {
    id: queueId,
    attemptData: {
      ...attemptData,
      id: queueId,
      offlineQueuedAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(CBT_STORE, 'readwrite');
    const store = tx.objectStore(CBT_STORE);
    store.put(item);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });

    console.log('[OfflineSync] CBT attempt cached in IndexedDB for Background Sync:', queueId);
    triggerBackgroundSync('sync-cbt-answers');
  } catch (err) {
    console.warn('[OfflineSync] Failed to queue CBT attempt in IndexedDB:', err);
  }

  return queueId;
}

/**
 * Enqueue a Wallet Transaction to IndexedDB for Service Worker Background Sync
 */
export async function enqueueWalletTransaction(txnData: any): Promise<string> {
  const queueId = `txn_offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: PendingWalletQueueItem = {
    id: queueId,
    txnData: {
      ...txnData,
      id: queueId,
      offlineQueuedAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(WALLET_STORE, 'readwrite');
    const store = tx.objectStore(WALLET_STORE);
    store.put(item);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });

    console.log('[OfflineSync] Wallet transaction cached in IndexedDB for Background Sync:', queueId);
    triggerBackgroundSync('sync-wallet-txns');
  } catch (err) {
    console.warn('[OfflineSync] Failed to queue Wallet transaction in IndexedDB:', err);
  }

  return queueId;
}

/**
 * Register SW Background Sync Tag if supported by browser
 */
export function triggerBackgroundSync(tag: string = 'sync-edukenza-offline') {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg: any) => {
        if (reg.sync) {
          return reg.sync.register(tag);
        }
      })
      .then(() => {
        console.log(`[OfflineSync] Service Worker background sync registered for tag: ${tag}`);
      })
      .catch((err) => {
        console.warn('[OfflineSync] SW background sync registration fallback:', err);
      });
  }
}

/**
 * Retrieve all pending CBT items from IndexedDB
 */
export async function getPendingCbtAttempts(): Promise<PendingCbtQueueItem[]> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(CBT_STORE, 'readonly');
    const store = tx.objectStore(CBT_STORE);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Retrieve all pending Wallet items from IndexedDB
 */
export async function getPendingWalletTxns(): Promise<PendingWalletQueueItem[]> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(WALLET_STORE, 'readonly');
    const store = tx.objectStore(WALLET_STORE);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Remove an item from CBT store
 */
export async function removePendingCbtAttempt(id: string): Promise<void> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(CBT_STORE, 'readwrite');
    tx.objectStore(CBT_STORE).delete(id);
  } catch (err) {
    console.warn('[OfflineSync] Failed to remove CBT queue item:', id, err);
  }
}

/**
 * Remove an item from Wallet store
 */
export async function removePendingWalletTxn(id: string): Promise<void> {
  try {
    const idb = await openIndexedDB();
    const tx = idb.transaction(WALLET_STORE, 'readwrite');
    tx.objectStore(WALLET_STORE).delete(id);
  } catch (err) {
    console.warn('[OfflineSync] Failed to remove Wallet queue item:', id, err);
  }
}

/**
 * Flush all offline queued items to Firestore when online
 */
export async function flushOfflineQueue(): Promise<{ syncedCbt: number; syncedWallet: number }> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { syncedCbt: 0, syncedWallet: 0 };
    }

    let syncedCbt = 0;
    let syncedWallet = 0;

    // 1. Sync CBT Answers
    const pendingCbt = await getPendingCbtAttempts().catch(() => []);
    for (const item of pendingCbt) {
      try {
        const { id: queueId, attemptData } = item;
        const firestorePayload = { ...attemptData };
        delete firestorePayload.id; // Let Firestore assign clean doc ID or keep metadata

        await addDoc(collection(db, 'cbtAttempts'), {
          ...firestorePayload,
          syncedViaBackgroundSync: true,
          createdAt: serverTimestamp()
        });

        await removePendingCbtAttempt(queueId);
        syncedCbt++;
        console.log(`[OfflineSync] Successfully pushed CBT attempt ${queueId} to Firestore!`);
      } catch (err) {
        console.warn('[OfflineSync] Error syncing CBT attempt to Firestore:', err);
      }
    }

    // 2. Sync Wallet Transactions
    const pendingWallet = await getPendingWalletTxns().catch(() => []);
    for (const item of pendingWallet) {
      try {
        const { id: queueId, txnData } = item;
        const firestorePayload = { ...txnData };
        delete firestorePayload.id;

        await addDoc(collection(db, 'walletTransactions'), {
          ...firestorePayload,
          syncedViaBackgroundSync: true,
          createdAt: serverTimestamp()
        });

        // Also update student wallet balance if balance updates were deferred
        if (txnData.schoolId && txnData.studentId && txnData.amount) {
          const isDeduction = ['canteen_purchase', 'transport_fee', 'shop_purchase', 'daily_service'].includes(txnData.type);
          const change = isDeduction ? -Math.abs(txnData.amount) : Math.abs(txnData.amount);
          try {
            const walletDocRef = doc(db, 'studentWallets', `${txnData.schoolId}_${txnData.studentId}`);
            await updateDoc(walletDocRef, {
              balance: increment(change),
              updatedAt: serverTimestamp()
            });
          } catch (wErr) {
            console.warn('[OfflineSync] Wallet balance doc update note:', wErr);
          }
        }

        await removePendingWalletTxn(queueId);
        syncedWallet++;
        console.log(`[OfflineSync] Successfully pushed Wallet transaction ${queueId} to Firestore!`);
      } catch (err) {
        console.warn('[OfflineSync] Error syncing Wallet transaction to Firestore:', err);
      }
    }

    if (syncedCbt > 0 || syncedWallet > 0) {
      // Notify application UI via custom DOM event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('edukenza-offline-synced', {
          detail: { syncedCbt, syncedWallet }
        }));
      }
    }

    return { syncedCbt, syncedWallet };
  } catch (err) {
    console.warn('[OfflineSync] flushOfflineQueue caught error:', err);
    return { syncedCbt: 0, syncedWallet: 0 };
  }
}

/**
 * Initialize automatic listeners for SW messages and Window online events
 */
export function initOfflineSyncEngine() {
  if (typeof window === 'undefined') return;

  // Listen for window 'online' event
  window.addEventListener('online', () => {
    console.log('[OfflineSync] Network reconnected! Initiating IndexedDB sync to Firestore...');
    flushOfflineQueue().catch((err) => {
      console.warn('[OfflineSync] Online flush error:', err);
    });
  });

  // Listen for SW messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'FLUSH_OFFLINE_QUEUE') {
        console.log('[OfflineSync] Received FLUSH_OFFLINE_QUEUE trigger from Service Worker');
        flushOfflineQueue().catch((err) => {
          console.warn('[OfflineSync] SW message flush error:', err);
        });
      }
    });
  }

  // Initial attempt on boot if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    setTimeout(() => {
      flushOfflineQueue().catch((err) => {
        console.warn('[OfflineSync] Initial boot flush error:', err);
      });
    }, 2000);
  }
}
