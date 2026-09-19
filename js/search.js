import { searchJournalGAS } from './api.js';
import { getCachedSearchResults, setCachedSearchResults } from './db.js';
import { renderSearchResults } from './ui.js';

function updateStatus(status, text) {
  const badge = document.getElementById('networkBadge');
  if (!badge) return;
  badge.className = `status-badge ${status}`;
  badge.textContent = text || (status === 'online' ? '🟢 連線正常' : '🟡 離線模式');
}

export async function executeSearch(keyword, targetField) {
  const container = document.getElementById('searchResults');
  if (!container) return;

  if (!keyword || !keyword.trim()) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">請輸入搜尋關鍵字</div>';
    return;
  }

  const queryKey = `${targetField}:${keyword.trim()}`;

  // 1. SWR 策略：先讀取 IndexedDB 本地快取
  try {
    const cached = await getCachedSearchResults(queryKey);
    if (cached && cached.results) {
      renderSearchResults(cached.results, container);
      updateStatus('online', '⚡ 已顯示本機快取，正在背景更新...');
    } else {
      container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">🔍 正在連線搜尋中...</div>';
    }
  } catch (e) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">🔍 正在連線搜尋中...</div>';
  }

  // 2. 向 GAS 後端取得最新搜尋結果
  try {
    const res = await searchJournalGAS(keyword.trim(), targetField);
    if (res && res.success && res.data) {
      renderSearchResults(res.data, container);
      await setCachedSearchResults(queryKey, res.data);
      updateStatus('online', '🟢 連線正常');
    } else {
      container.innerHTML = `<div style="color:#c53030; text-align:center; padding:16px;">搜尋失敗：${res ? res.error : '未知錯誤'}</div>`;
    }
  } catch (err) {
    updateStatus('offline', '🟡 離線模式 (僅顯示快取)');
  }
}
