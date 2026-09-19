export function renderSearchResults(results, containerEl, isFromCache = false) {
  if (!results || results.length === 0) {
    containerEl.innerHTML = '<div style="text-align:center; padding:16px; color:#888;">查無紀錄</div>';
    return;
  }

  const cacheNotice = isFromCache
    ? '<div style="font-size:11px; color:#b18a62; margin-bottom:8px;">⚡ 本機快取即時載入中（背景同步中...）</div>'
    : '';

  const html = results.map((item) => `
    <div class="result-card" style="background:#fff; border-left:3px solid #b33b32; padding:12px; margin-top:10px; border-radius:4px; border:1px solid #dedbd1;">
      <div style="font-size:12px; color:#777;">${item.date || ''} ${item.time || ''}</div>
      <div style="font-weight:bold; font-size:15px; margin:4px 0;">${escapeHtml(item.title || '')}</div>
      <div style="font-size:13px; color:#444; white-space:pre-line;">${(item.lines || []).join('\n')}</div>
    </div>
  `).join('');

  containerEl.innerHTML = cacheNotice + html;
}

export function setNetworkStatus(isOnline) {
  const dot = document.querySelector('.status-dot');
  if (!dot) return;
  if (isOnline) {
    dot.classList.add('online');
    dot.classList.remove('offline');
  } else {
    dot.classList.remove('online');
    dot.classList.add('offline');
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
