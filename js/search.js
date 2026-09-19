import { searchJournalGAS } from './api.js';
import { renderSearchResults } from './ui.js';

// 更新連線狀態顯示
function updateStatus(status, text) {
  const badge = document.getElementById('networkBadge');
  if (!badge) return;
  badge.className = `status-badge ${status}`;
  badge.textContent = text || (status === 'online' ? '🟢 連線正常' : '🟡 離線模式');
}

// 搜尋執行主入口
export async function executeSearch(keyword, targetField = 'both') {
  const container = document.getElementById('searchResults');
  if (!container) return;

  if (!keyword || !keyword.trim()) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">請輸入搜尋關鍵字</div>';
    return;
  }

  const queryKey = `ems_search_${targetField}_${keyword.trim()}`;

  // 1. 本地快取秒開
  const cached = localStorage.getItem(queryKey);
  if (cached) {
    try {
      const parsedData = JSON.parse(cached);
      if (parsedData && parsedData.length > 0) {
        renderSearchResults(parsedData, container);
        updateStatus('online', '⚡ 顯示本機快取中，正在背景同步...');
      }
    } catch (e) {}
  } else {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">🔍 正在連線搜尋中...</div>';
  }

  // 2. 向後端 GAS 請求搜尋
  try {
    const res = await searchJournalGAS(keyword.trim(), targetField);
    if (res && res.success && res.data) {
      renderSearchResults(res.data, container);
      localStorage.setItem(queryKey, JSON.stringify(res.data));
      updateStatus('online', '🟢 連線正常');
    } else {
      if (!cached) {
        container.innerHTML = `<div style="color:#c53030; text-align:center; padding:16px;">搜尋失敗：${res ? res.error : '查無資料'}</div>`;
      }
    }
  } catch (err) {
    updateStatus('offline', '🟡 離線模式 (僅顯示快取)');
  }
}

// 相容 app.js 的即時搜尋匯出名稱
export const performInstantSearch = executeSearch;
