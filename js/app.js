import { performInstantSearch } from './search.js';
import { saveOfflineDraft, getPendingSyncCount } from './db.js';
import { callGasApi } from './api.js';

let stagedFiles = [];
let uploadEngine = null; // 按需載入上傳引擎

// 註冊 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.getElementById('updateBanner');
            if (banner) banner.style.display = 'flex';
          }
        });
      });
    } catch (err) {
      console.warn('[SW Registration Failed]', err);
    }
  });

  document.getElementById('btnApplyUpdate')?.addEventListener('click', () => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

// 頁面路由切換（首頁 ➔ 各分頁）
window.showSection = function(type) {
  document.getElementById('homeView').style.display = 'none';
  document.getElementById('section-memo').style.display = type === 'memo' ? 'block' : 'none';
  document.getElementById('section-task').style.display = type === 'task' ? 'block' : 'none';
  document.getElementById('section-search').style.display = type === 'search' ? 'block' : 'none';
};

window.goHome = function() {
  document.getElementById('homeView').style.display = 'block';
  document.getElementById('section-memo').style.display = 'none';
  document.getElementById('section-task').style.display = 'none';
  document.getElementById('section-search').style.display = 'none';
  loadTasks();
};

// 標籤點選事件
document.querySelectorAll('.tag-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('active');
  });
});

// 檔案選取與按需載入 upload.js
document.getElementById('btnPickFile')?.addEventListener('click', async () => {
  if (!uploadEngine) {
    uploadEngine = await import('./upload.js');
  }
  document.getElementById('filePicker').click();
});

document.getElementById('filePicker')?.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  files.forEach(f => {
    stagedFiles.push({ file: f, name: f.name, size: f.size, type: f.type });
  });
  renderSelectedFiles();
  document.getElementById('filePicker').value = '';
});

function renderSelectedFiles() {
  const container = document.getElementById('selectedFileList');
  if (!container) return;
  if (stagedFiles.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = stagedFiles.map((f, i) => {
    const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
    const isLarge = f.size > 7 * 1024 * 1024;
    return `
      <div class="file-chip">
        <div class="file-chip-info">
          <span>📎</span>
          <span class="file-name" title="${f.name}">${f.name}</span>
          <span class="file-badge ${isLarge ? 'large' : ''}">${sizeMB} MB</span>
        </div>
        <button type="button" class="btn-file-del" onclick="window.removeSelectedFile(${i})">🗑️</button>
      </div>
    `;
  }).join('');
}

window.removeSelectedFile = function(idx) {
  stagedFiles.splice(idx, 1);
  renderSelectedFiles();
};

// 搜尋日誌
document.getElementById('btnExecuteSearch')?.addEventListener('click', () => {
  const q = document.getElementById('searchKeyword').value.trim();
  const s = document.getElementById('searchStartDate').value;
  const e = document.getElementById('searchEndDate').value;
  const resultContainer = document.getElementById('searchResultList');
  performInstantSearch(q, s, e, resultContainer);
});

document.getElementById('btnClearSearch')?.addEventListener('click', () => {
  document.getElementById('searchKeyword').value = '';
  document.getElementById('searchStartDate').value = '';
  document.getElementById('searchEndDate').value = '';
  document.getElementById('searchResultList').innerHTML = '';
});

// 新增備忘
document.getElementById('memoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitMemo');
  btn.disabled = true;
  btn.textContent = '處理中...';

  const selectedTags = Array.from(document.querySelectorAll('.tag-chip.active')).map(c => c.textContent.trim());
  const customInput = document.getElementById('customTags').value.trim();
  if (customInput) {
    const splitTags = customInput.split(/[\s,，]+/);
    splitTags.forEach(t => {
      const clean = t.replace(/^#/, '').trim();
      if (clean && !selectedTags.includes(clean)) {
        selectedTags.push(clean);
      }
    });
  }

  const memoData = {
    title: document.getElementById('memoTitle').value.trim(),
    content: document.getElementById('memoContent').value.trim(),
    date: document.getElementById('memoDate').value,
    tags: selectedTags
  };

  if (!navigator.onLine) {
    await saveOfflineDraft(memoData);
    alert('【離線模式】目前無網路連線，勤務紀錄已暫存於本機離線草稿箱！恢復連線時將自動同步。');
    btn.disabled = false;
    btn.textContent = '儲存並發布至雲端';
    updateSyncBadge();
    goHome();
    return;
  }

  try {
    let uploadedFilesInfo = [];
    if (stagedFiles.length > 0) {
      if (!uploadEngine) uploadEngine = await import('./upload.js');
      const eventDate = memoData.date ? new Date(memoData.date) : new Date();
      const year = eventDate.getFullYear();
      for (const f of stagedFiles) {
        const res = await uploadEngine.uploadSingleFileParallel(f.file, year);
        uploadedFilesInfo.push(res);
      }
    }

    memoData.uploadedFiles = uploadedFilesInfo;
    const saveRes = await callGasApi('saveMemoDoc', memoData);
    alert(saveRes.message || '儲存成功！');
    stagedFiles = [];
    renderSelectedFiles();
    document.getElementById('memoForm').reset();
    document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
    goHome();
  } catch (err) {
    console.warn('[Sync Error] 儲存失敗，自動轉入離線草稿箱', err);
    await saveOfflineDraft(memoData);
    alert('通訊失敗，資料已安全暫存於本機離線草稿箱中！');
  } finally {
    btn.disabled = false;
    btn.textContent = '儲存並發布至雲端';
    updateSyncBadge();
  }
});

// 新增待辦事項
document.getElementById('btnSubmitTask')?.addEventListener('click', async () => {
  const title = document.getElementById('taskTitle').value.trim();
  const due = document.getElementById('taskDue').value;
  const notes = document.getElementById('taskNotes').value.trim();
  if (!title) return alert('請輸入待辦標題！');

  try {
    const res = await callGasApi('addTask', { title, due, notes });
    alert(res.message || '待辦事項新增成功！');
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDue').value = '';
    document.getElementById('taskNotes').value = '';
    goHome();
  } catch (err) {
    alert('新增待辦失敗：' + err.message);
  }
});

// 載入待辦事項
window.loadTasks = async function() {
  const container = document.getElementById('taskList');
  if (!container) return;
  container.innerHTML = '<div style="color:#666; font-size:14px; text-align:center;">同步待辦事項中...</div>';
  try {
    const tasks = await callGasApi('getTasks');
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div style="color:#666; font-size:14px; text-align:center; padding:10px;">🎉 目前無未完成的消防待辦事項</div>';
      return;
    }
    container.innerHTML = tasks.map(t => `
      <div class="task-item" id="task-${t.id}">
        <input type="checkbox" class="task-checkbox" onchange="window.completeTask('${t.id}')">
        <div class="task-content">
          <div class="task-title">${t.title}</div>
          ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}
          ${t.due ? `<div class="task-due">📅 到期日：${t.due}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div style="color:#b33b32; text-align:center; padding:10px;">載入待辦失敗：${e.message}</div>`;
  }
};

window.completeTask = async function(taskId) {
  const el = document.getElementById(`task-${taskId}`);
  if (el) el.classList.add('fade-out');
  try {
    await callGasApi('completeTask', { taskId });
    setTimeout(() => {
      if (el) el.remove();
      if (document.querySelectorAll('.task-item:not(.fade-out)').length === 0) {
        document.getElementById('taskList').innerHTML = '<div style="color:#666; font-size:14px; text-align:center; padding:10px;">🎉 目前無未完成的消防待辦事項</div>';
      }
    }, 300);
  } catch (e) {
    alert('完成待辦失敗：' + e.message);
    if (el) el.classList.remove('fade-out');
  }
};

// 網路連線與同步指示燈
async function updateSyncBadge() {
  const count = await getPendingSyncCount();
  const badge = document.getElementById('pendingCount');
  if (badge) {
    if (count > 0) {
      badge.style.display = 'inline-block';
      badge.textContent = `${count} 待同步`;
    } else {
      badge.style.display = 'none';
    }
  }
}

window.addEventListener('online', () => {
  document.querySelector('.status-dot')?.classList.add('online');
  document.querySelector('.status-dot')?.classList.remove('offline');
  const txt = document.querySelector('.status-text');
  if (txt) txt.textContent = '連線正常';
  updateSyncBadge();
});

window.addEventListener('offline', () => {
  document.querySelector('.status-dot')?.classList.remove('online');
  document.querySelector('.status-dot')?.classList.add('offline');
  const txt = document.querySelector('.status-text');
  if (txt) txt.textContent = '離線模式';
});

// 初始化
const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
const dateInput = document.getElementById('memoDate');
if (dateInput) dateInput.value = now.toISOString().slice(0, 16);

loadTasks();
updateSyncBadge();
