// 請替換為您的真實 GAS 部署網址
const GAS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbx5tizEgp6f_7Rmx6jzorkDYddm-KwahOrjUNhwrDtN9Loq3ylnodUlV6cdMhneCVtw9Q/exec";

// 封裝具有容錯與合理逾時的 fetch
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// 取得待辦事項：支援 SWR (Stale-While-Revalidate) 快取
export async function getTasksGAS() {
  const CACHE_KEY = 'ems_cached_tasks';
  
  // 1. 如果本地有舊快取，先回傳快取給畫面「秒顯」
  const localCached = localStorage.getItem(CACHE_KEY);
  let cachedData = null;
  if (localCached) {
    try {
      cachedData = JSON.parse(localCached);
    } catch (e) {}
  }

  // 2. 向 GAS 請求最新資料（逾時放寬至 20 秒，容納 GAS 冷啟動）
  try {
    const res = await fetchWithTimeout(`${GAS_API_ENDPOINT}?action=getTasks`, {
      method: 'GET',
      mode: 'cors'
    }, 20000);
    
    const result = await res.json();
    if (result && result.success) {
      // 存入快取
      localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
      return { success: true, data: result.data, fromCache: false };
    }
  } catch (err) {
    // 網路太慢或失敗時，若有快取就優雅降級
    if (cachedData) {
      return { success: true, data: cachedData, fromCache: true };
    }
    throw new Error('Google Tasks 連線逾時，請稍後點擊重新整理');
  }

  return { success: true, data: cachedData || [], fromCache: true };
}

// 搜尋日誌
export async function searchJournalGAS(keyword, targetField = 'both') {
  const url = `${GAS_API_ENDPOINT}?action=search&keyword=${encodeURIComponent(keyword)}&targetField=${encodeURIComponent(targetField)}`;
  const res = await fetchWithTimeout(url, { method: 'GET', mode: 'cors' }, 25000);
  return await res.json();
}

// 送出新增/編輯等操作 (POST)
export async function postToGAS(payload) {
  const res = await fetch(GAS_API_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors', // 避免 GAS 重定向跨域問題
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { success: true };
}
