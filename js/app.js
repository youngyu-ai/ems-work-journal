import { getTasksGAS, callGasApi } from './api.js';
import { renderTasks, setNetworkStatus } from './ui.js';
import { getPendingSyncCount, addOfflineDraft } from './db.js';
import { executeSearch } from './search.js';

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupSyncBadge();
  await loadTaskList();
});

// 頁面導航切換
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-card');
  const sections = document.querySelectorAll('.app-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      sections.forEach(s => s.classList.remove('active'));
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add('active');
    });
  });

  const backBtns = document.querySelectorAll('.btn-back');
  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sections.forEach(s => s.classList.remove('active'));
      document.getElementById('homeSection')?.classList.add('active');
    });
  });

  // 重新整理待辦按鈕
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
    container.innerHTML = '<div style="color:#666; text-align:center; padding:10px;">🔄 正在同步待辦事項...</div>';
  }

  try {
    const res = await getTasksGAS();
    if (res && res.success) {
      renderTasks(res.data);
      setNetworkStatus('online', '🟢 連線正常');
    } else {
      container.innerHTML = `<div style="color:#c53030; text-align:center; padding:10px;">載入待辦失敗：${res ? res.error : ''}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:#c53030; text-align:center; padding:10px;">載入待辦失敗：${err.message || '連線逾時'}</div>`;
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

// 全域掛載供 HTML 點擊事件調用
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

window.openFollowupModal = function(idx) {
  alert(`準備追加第 ${idx + 1} 筆紀錄之後續處理`);
};

window.openEditModal = function(idx) {
  alert(`準備編輯第 ${idx + 1} 筆紀錄內容`);
};

window.deleteHistory = async function(idx) {
  if (confirm(`確定要刪除第 ${idx + 1} 筆歷史日誌嗎？此動作無法復原！`)) {
    alert('正在刪除...');
  }
};
