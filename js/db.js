// IndexedDB 資料庫管理模組
const DB_NAME = 'EMS_Journal_DB';
const DB_VERSION = 1;

let dbInstance = null;

// 開啟並初始化 IndexedDB
export function openDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // 離線待同步草稿箱
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
      // SWR 搜尋結果本機快取
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

// 儲存搜尋結果至快取 (附帶時間戳記)
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

// 離線草稿：加入待同步佇列
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

// 離線草稿：取得全部待同步項目
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

// 離線草稿：刪除已同步項目
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
