export function renderSearchResults(results, containerEl, isFromCache = false) {
  if (!containerEl) return;
  if (!results || results.length === 0) {
    containerEl.innerHTML = '<div style="text-align:center; padding:16px; color:#888;">查無符合條件之紀錄</div>';
    return;
  }

  const cacheNotice = isFromCache
    ? '<div style="font-size:11px; color:#b18a62; margin-bottom:8px;">⚡ 本機快取即時載入中（背景同步中...）</div>'
    : '';

  const html = results.map((item) => {
    const textLines = (item.lines || []).map(line => escapeHtml(line)).join('<br>');
    const linksHtml = (item.links && item.links.length > 0)
      ? '<div style="margin-top:8px;">' +
        item.links.map(l => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-right:8px; font-size:12px; color:#1a73e8;">📎 ${escapeHtml(l.name || '雲端檔案')}</a>`).join('') +
        '</div>'
      : '';

    return `
      <div class="result-card" style="background:#fffefb; border-left:3px solid #b33b32; padding:12px; margin-top:10px; border-radius:4px; border:1px solid #dedbd1; line-height:1.6;">
        <div style="font-size:12px; color:#777;">${escapeHtml(item.date || '')} ${escapeHtml(item.time || '')}</div>
        <div style="font-weight:bold; font-size:15px; margin:4px 0; color:#333;">${escapeHtml(item.title || '')}</div>
        <div style="font-size:13px; color:#444;">${textLines}</div>
        ${linksHtml}
      </div>
    `;
  }).join('');

  containerEl.innerHTML = cacheNotice + html;
}

export function setNetworkStatus(isOnline) {
  const dot = document.querySelector('.status-dot');
  const text = document.querySelector('.status-text');
  if (dot) {
    if (isOnline) {
      dot.classList.add('online');
      dot.classList.remove('offline');
      if (text) text.textContent = '連線正常';
    } else {
      dot.classList.remove('online');
      dot.classList.add('offline');
      if (text) text.textContent = '離線模式';
    }
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
