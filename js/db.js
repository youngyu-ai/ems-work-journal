// IndexedDB 資料庫管理模組
const DB_NAME = 'EMS_Journal_DB';
const DB_VERSION = 1;

let dbInstance = null;

export function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('search_cache')) {
        db.createObjectStore('search_cache', { keyPath: 'query' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// 供 app.js 查詢待同步數量
export async function getPendingSyncCount() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('offline_queue', 'readonly');
      const store = tx.objectStore('offline_queue');
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result || 0);
      countReq.onerror = () => resolve(0);
    });
  } catch (err) {
    return 0;
  }
}

// 取得搜尋快取
export async function getCachedSearchResults(queryKey) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('search_cache', 'readonly');
      const store = tx.objectStore('search_cache');
      const req = store.get(queryKey);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

// 儲存搜尋快取
export async function setCachedSearchResults(queryKey, results) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('search_cache', 'readwrite');
      const store = tx.objectStore('search_cache');
      store.put({
        query: queryKey,
        results: results,
        updatedAt: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

// 離線草稿箱：新增
export async function addOfflineDraft(data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline_queue', 'readwrite');
      const store = tx.objectStore('offline_queue');
      const req = store.add({
        ...data,
        createdAt: Date.now()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    throw err;
  }
}

// 離線草稿箱：列出
export async function getOfflineDrafts() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('offline_queue', 'readonly');
      const store = tx.objectStore('offline_queue');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

// 離線草稿箱：刪除
export async function removeOfflineDraft(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('offline_queue', 'readwrite');
      const store = tx.objectStore('offline_queue');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}
