// 渲染待辦事項清單
export function renderTasks(tasks) {
  const container = document.getElementById('taskList');
  if (!container) return;

  // 防呆處理：相容 { success: true, data: [...] } 或直接傳入 array
  let taskArray = tasks;
  if (tasks && typeof tasks === 'object' && !Array.isArray(tasks)) {
    if (Array.isArray(tasks.data)) {
      taskArray = tasks.data;
    } else if (Array.isArray(tasks.items)) {
      taskArray = tasks.items;
    } else {
      taskArray = [];
    }
  }

  if (!taskArray || !Array.isArray(taskArray) || taskArray.length === 0) {
    container.innerHTML = '<div style="color:#666; font-size:14px; text-align:center; padding:10px;">🎉 目前無未完成的消防待辦事項</div>';
    return;
  }

  container.innerHTML = taskArray.map(t => `
    <div class="task-item" id="task-${t.id}">
      <input type="checkbox" class="task-checkbox" onchange="window.completeTask('${t.id}')">
      <div class="task-content">
        <div class="task-title">${escapeHtml(t.title)}</div>
        ${t.notes ? `<div class="task-notes">${escapeHtml(t.notes)}</div>` : ''}
        ${t.due ? `<div class="task-due">📅 到期日：${escapeHtml(t.due)}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// 渲染歷史日誌搜尋結果
export function renderSearchResults(results, container) {
  if (!container) return;

  let resultArray = results;
  if (results && typeof results === 'object' && !Array.isArray(results)) {
    resultArray = Array.isArray(results.data) ? results.data : [];
  }

  if (!resultArray || !Array.isArray(resultArray) || resultArray.length === 0) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">查無符合條件之紀錄</div>';
    return;
  }

  container.innerHTML = resultArray.map((r, idx) => {
    const textHtml = (r.lines || []).map(l => `<div>${escapeHtml(l)}</div>`).join('');
    const linksHtml = (r.links && r.links.length > 0)
      ? '<div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">' +
        r.links.map(l => `<a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="search-file-btn"><span>📎</span><span style="flex:1;">開啟：${escapeHtml(l.name)}</span></a>`).join('') + '</div>'
      : '';
    const meta = (r.date || r.time) ? `<div class="result-meta">${escapeHtml(r.date || '')}${r.time ? ' · ' + escapeHtml(r.time) : ''}</div>` : '';
    const actionButtons = (r.title && r.time)
      ? `<div class="result-actions">
           <button class="result-action followup" onclick="window.openFollowupModal(${idx})">➕ 新增後續處理</button>
           <button class="result-action edit" onclick="window.openEditModal(${idx})">✏️ 編輯內容</button>
           <button class="result-action delete" onclick="window.deleteHistory(${idx})">🗑️ 刪除紀錄</button>
         </div>` : '';
    return `<div class="result-item">${meta}${textHtml}${linksHtml}${actionButtons}</div>`;
  }).join('');
}

// 更新網路狀態徽章
export function setNetworkStatus(status, text) {
  const badge = document.getElementById('networkBadge');
  if (!badge) return;
  badge.className = `status-badge ${status}`;
  badge.textContent = text || (status === 'online' ? '🟢 連線正常' : '🟡 離線模式');
}

// 跳脫 HTML 字元
export function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
