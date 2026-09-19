const DB_NAME = 'EMS_Offline_DB_V3';
const DB_VERSION = 1;

const STORES = {
  SEARCH_CACHE: 'search_cache',       // 搜尋快取 (SWR 立即顯示)
  OFFLINE_DRAFTS: 'offline_drafts',   // 斷線時暫存的勤務紀錄草稿
  SYNC_QUEUE: 'sync_queue',           // 待上傳/同步任務佇列
  META: 'meta'                        // 本機統計與設定
};

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORES.SEARCH_CACHE)) {
        db.createObjectStore(STORES.SEARCH_CACHE, { keyPath: 'queryKey' });
      }

      if (!db.objectStoreNames.contains(STORES.OFFLINE_DRAFTS)) {
        db.createObjectStore(STORES.OFFLINE_DRAFTS, { keyPath: 'draftId' });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('status', 'status', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalSearchCache(queryKey) {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.SEARCH_CACHE, 'readonly');
      const req = tx.objectStore(STORES.SEARCH_CACHE).get(queryKey);
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function setLocalSearchCache(queryKey, data) {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.SEARCH_CACHE, 'readwrite');
      tx.objectStore(STORES.SEARCH_CACHE).put({
        queryKey,
        data,
        updatedAt: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

export async function saveOfflineDraft(draftData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.OFFLINE_DRAFTS, STORES.SYNC_QUEUE], 'readwrite');
    const draftId = 'draft_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    tx.objectStore(STORES.OFFLINE_DRAFTS).put({
      draftId,
      ...draftData,
      createdAt: new Date().toISOString()
    });

    tx.objectStore(STORES.SYNC_QUEUE).add({
      type: 'CREATE_MEMO',
      draftId,
      payload: draftData,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now()
    });

    tx.oncomplete = () => resolve(draftId);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSyncCount() {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const req = tx.objectStore(STORES.SYNC_QUEUE).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    });
  } catch (e) {
    return 0;
  }
}
