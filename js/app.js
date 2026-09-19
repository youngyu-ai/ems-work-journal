import { getTasksGAS, callGasApi } from './api.js';
import { renderTasks, setNetworkStatus } from './ui.js';
import { getPendingSyncCount } from './db.js';
import { executeSearch } from './search.js';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupSyncBadge();
  await loadTaskList();
});

// 切換分頁邏輯
function showSection(sectionId) {
  const sections = ['homeSection', 'memoSection', 'taskSection', 'searchSection'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = (id === sectionId) ? 'block' : 'none';
    }
  });
}

// 綁定所有點擊事件
function setupNavigation() {
  document.getElementById('btnGoMemo')?.addEventListener('click', () => showSection('memoSection'));
  document.getElementById('btnGoTask')?.addEventListener('click', () => showSection('taskSection'));
  document.getElementById('btnGoSearch')?.addEventListener('click', () => showSection('searchSection'));

  // 所有返回按鈕
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => showSection('homeSection'));
  });

  // 待辦重新整理按鈕
  document.getElementById('refreshTasksBtn')?.addEventListener('click', () => {
    loadTaskList(true);
  });

  // 搜尋按鈕
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    const kw = document.getElementById('searchKeyword')?.value;
    const field = document.getElementById('searchTargetField')?.value || 'both';
    executeSearch(kw, field);
  });
}

// 載入待辦清單
async function loadTaskList(force = false) {
  const container = document.getElementById('taskList');
  if (!container) return;

  if (force) {
    container.innerHTML = '<div style="color:#666; text-align:center; padding:12px;">🔄 正在同步「消防」待辦...</div>';
  }

  try {
    const res = await getTasksGAS();
    if (res && res.success) {
      renderTasks(res.data);
      setNetworkStatus('online', '🟢 連線正常');
    } else {
      container.innerHTML = `<div style="color:#c53030; text-align:center; padding:12px;">載入待辦失敗：${res ? res.error : ''}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:#c53030; text-align:center; padding:12px;">載入待辦失敗：${err.message || '連線逾時'}</div>`;
    setNetworkStatus('offline', '🟡 離線模式');
  }
}

// 同步狀態計數徽章
async function setupSyncBadge() {
  try {
    const count = await getPendingSyncCount();
    const badge = document.getElementById('pendingSyncBadge');
    if (badge) {
      badge.textContent = count > 0 ? `(${count} 筆待同步)` : '';
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  } catch (e) {}
}

// 完成待辦全域函式
window.completeTask = async function(taskId) {
  if (!confirm('確定已完成此項待辦事項？')) return;
  const taskEl = document.getElementById(`task-${taskId}`);
  if (taskEl) taskEl.style.opacity = '0.4';

  const res = await callGasApi('completeTask', { taskId });
  if (res && res.success) {
    await loadTaskList(true);
  } else {
    alert('標記失敗：' + (res.error || '請檢查網路'));
    if (taskEl) taskEl.style.opacity = '1';
  }
};
