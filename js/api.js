// 請替換為您的真實 GAS 部署網址 (結尾為 /exec)
const GAS_API_ENDPOINT = "https://script.google.com/macros/s/AKfycbx5tizEgp6f_7Rmx6jzorkDYddm-KwahOrjUNhwrDtN9Loq3ylnodUlV6cdMhneCVtw9Q/exec";

// 1. 通用 API 呼叫 (供 app.js 使用)
export async function callGasApi(action, data = {}) {
  try {
    const payload = { action, ...data };
    const response = await fetch(GAS_API_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (err) {
    console.error("GAS API 呼叫失敗:", err);
    return { success: false, error: err.toString() };
  }
}

// 2. 取得待辦事項清單 (支援本機 SWR 快取秒開)
export async function getTasksGAS() {
  const CACHE_KEY = 'ems_cached_tasks';
  const localCached = localStorage.getItem(CACHE_KEY);
  let cachedData = null;
  if (localCached) {
    try { cachedData = JSON.parse(localCached); } catch (e) {}
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 20000); // 20 秒逾時
    const res = await fetch(`${GAS_API_ENDPOINT}?action=getTasks`, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(id);
    const result = await res.json();
    if (result && result.success) {
      const items = Array.isArray(result.data) ? result.data : (result.data?.items || []);
      localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      return { success: true, data: items };
    }
  } catch (err) {
    if (cachedData) {
      return { success: true, data: cachedData, fromCache: true };
    }
    throw err;
  }
  return { success: true, data: cachedData || [] };
}

// 3. 搜尋日誌
export async function searchJournalGAS(keyword, targetField = 'both') {
  const url = `${GAS_API_ENDPOINT}?action=search&keyword=${encodeURIComponent(keyword)}&targetField=${encodeURIComponent(targetField)}`;
  const res = await fetch(url, { method: 'GET', mode: 'cors' });
  return await res.json();
}

// 4. POST 請求輔助
export async function postToGAS(payload) {
  return await callGasApi(payload.action, payload);
}
