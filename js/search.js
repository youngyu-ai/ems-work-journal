import { getLocalSearchCache, setLocalSearchCache } from './db.js';
import { callGasApi } from './api.js';
import { renderSearchResults, setNetworkStatus } from './ui.js';

export async function performInstantSearch(query, startDate, endDate, containerEl) {
  const queryKey = [query || '', startDate || '', endDate || ''].join('|').toLowerCase();

  // 1.【Instant UI】立即從 IndexedDB 讀取並呈現本機快取
  const cachedData = await getLocalSearchCache(queryKey);
  if (cachedData && cachedData.length > 0) {
    renderSearchResults(cachedData, containerEl, true);
  } else {
    containerEl.innerHTML = '<div class="loading-box">🔍 正在向雲端檢索日誌...</div>';
  }

  // 2.【背景請求】同時向 GAS 取得最新資料
  try {
    const freshData = await callGasApi('search', {
      query,
      startDate,
      endDate
    });

    // 3. 更新本機快取
    await setLocalSearchCache(queryKey, freshData);

    // 4. 平滑更新畫面為最新結果
    renderSearchResults(freshData, containerEl, false);
    setNetworkStatus(true);
  } catch (error) {
    console.warn('[Search] 背景更新失敗，保留目前快取資料:', error);
    setNetworkStatus(false);
    if (!cachedData) {
      containerEl.innerHTML = `<div class="error-box">連線異常，且本地無此條件快取：${error.message}</div>`;
    }
  }
}
