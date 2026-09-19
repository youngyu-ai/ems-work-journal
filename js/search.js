import { searchJournalGAS } from './api.js';
import { getCachedSearchResults, setCachedSearchResults } from './db.js';
import { renderSearchResults, setNetworkStatus } from './ui.js';

export async function executeSearch(keyword, targetField) {
  const container = document.getElementById('searchResults');
  if (!container) return;

  if (!keyword || !keyword.trim()) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">請輸入搜尋關鍵字</div>';
    return;
  }

  const queryKey = `${targetField}:${keyword.trim()}`;

  // 1. SWR 策略：先嘗試讀取本地快取秒開
  try {
    const cached = await getCachedSearchResults(queryKey);
    if (cached && cached.results && cached.results.length > 0) {
      renderSearchResults(cached.results, container);
      setNetworkStatus('online', '⚡ 顯示快取中，正在背景同步...');
    } else {
      container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">🔍 正在連線搜尋中...</div>';
    }
  } catch (e) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">🔍 正在連線搜尋中...</div>';
  }

  // 2. 向 GAS 發送查詢
  try {
    const res = await searchJournalGAS(keyword.trim(), targetField);
    if (res && res.success && res.data) {
      renderSearchResults(res.data, container);
      await setCachedSearchResults(queryKey, res.data);
      setNetworkStatus('online', '🟢 連線正常');
    } else {
      container.innerHTML = `<div style="color:#c53030; text-align:center; padding:16px;">搜尋失敗：${res ? res.error : '查無資料'}</div>`;
    }
  } catch (err) {
    setNetworkStatus('offline', '🟡 離線模式 (僅顯示快取)');
  }
}
