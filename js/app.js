import { performInstantSearch } from './search.js';
import { saveOfflineDraft, getPendingSyncCount } from './db.js';
import { callGasApi } from './api.js';

let stagedFiles = [];
let uploadEngine = null; // 支援按需載入上傳引擎 (Lazy Loading)

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

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    document.getElementById(target)?.classList.add('active');
    if (target === 'section-tasks') loadTasks();
  });
});

document.querySelectorAll('.tag-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    chip.classList.toggle('active');
  });
});

document.getElementById('btnPickFile')?.addEventListener('click', async () => {
  if (!uploadEngine) {
    console.log('[Lazy Loading] 正在按需載入 upload.js 模組...');
    uploadEngine = await import('./upload.js');
  }
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput')?.addEventListener('change', (e) => {
  const files = Array.from(e.target.files);
  stagedFiles.push(...files);
  renderSelectedFiles();
});

function renderSelectedFiles() {
  const container = document.getElementById('selectedFileList');
  if (!container) return;
  container.innerHTML = stagedFiles.map((f, i) => `
    <div style="font-size:12px; margin-top:4px; color:#555; display:flex; justify-content:space-between;">
      <span>📎 ${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)</span>
      <button type="button" onclick="window.removeSelectedFile(${i})" style="border:none; background:none; cursor:pointer; color:#b33b32;">✕</button>
    </div>
  `).join('');
}

window.removeSelectedFile = function(idx) {
  stagedFiles.splice(idx, 1);
  renderSelectedFiles();
};

document.getElementById('btnExecuteSearch')?.addEventListener('click', () => {
  const q = document.getElementById('searchKeyword').value.trim();
  const s = document.getElementById('searchStartDate').value;
  const e = document.getElementById('searchEndDate').value;
  const resultContainer = document.getElementById('searchResultList');
  performInstantSearch(q, s, e, resultContainer);
});

document.getElementById('memoForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitMemo');
  btn.disabled = true;
  btn.textContent = '處理中...';

  const selectedTags = Array.from(document.querySelectorAll('.tag-chip.active')).map(c => c.textContent.trim());

  const memoData = {
    title: document.getElementById('memoTitle').value.trim(),
    content: document.getElementById('memoContent').value.trim(),
    date: document.getElementById('memoDate').value,
    tags: selectedTags
  };

  // 離線判定：若無網路連線，自動進入 IndexedDB 離線草稿箱
  if (!navigator.onLine) {
    await saveOfflineDraft(memoData);
    alert('【離線模式】目前無網路連線，勤務紀錄已暫存於本機離線草稿箱！恢復連線時將自動同步。');
    btn.disabled = false;
    btn.textContent = '儲存並同步至雲端';
    updateSyncBadge();
    return;
  }

  try {
    let uploadedFilesInfo = [];
    if (stagedFiles.length > 0) {
      if (!uploadEngine) uploadEngine = await import('./upload.js');
      const year = new Date().getFullYear();
      for (const f of stagedFiles) {
        const res = await uploadEngine.uploadSingleFileParallel(f, year);
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
  } catch (err) {
    console.warn('[Sync Error] 儲存失敗，自動轉入離線草稿箱', err);
    await saveOfflineDraft(memoData);
    alert('通訊失敗，資料已安全暫存於本機離線草稿箱中！');
  } finally {
    btn.disabled = false;
    btn.textContent = '儲存並同步至雲端';
    updateSyncBadge();
  }
});

async function loadTasks() {
  const container = document.getElementById('taskListContainer');
  container.innerHTML = '<div style="color:#777; font-size:13px; text-align:center;">同步待辦中...</div>';
  try {
    const tasks = await callGasApi('getTasks');
    if (!tasks || tasks.length === 0) {
      container.innerHTML = '<div style="color:#777; text-align:center; padding:12px;">🎉 目前無未完成的消防待辦事項</div>';
      return;
    }
    container.innerHTML = tasks.map(t => `
      <div class="task-item" style="display:flex; gap:10px; padding:10px 0; border-bottom:1px solid #e5e2d9;">
        <input type="checkbox" onchange="window.completeTask('${t.id}')">
        <div>
          <div style="font-weight:600; font-size:14px;">${t.title}</div>
          ${t.due ? `<div style="font-size:12px; color:#b33b32;">到期日：${t.due}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = `<div style="color:#b33b32;">載入待辦失敗：${e.message}</div>`;
  }
}

window.completeTask = async function(taskId) {
  try {
    await callGasApi('completeTask', { taskId });
    loadTasks();
  } catch (e) {
    alert('完成待辦失敗：' + e.message);
  }
};

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

window.addEventListener('online', async () => {
  document.querySelector('.status-dot')?.classList.add('online');
  document.querySelector('.status-dot')?.classList.remove('offline');
  updateSyncBadge();
});

window.addEventListener('offline', () => {
  document.querySelector('.status-dot')?.classList.remove('online');
  document.querySelector('.status-dot')?.classList.add('offline');
});

const now = new Date();
now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
const dateInput = document.getElementById('memoDate');
if (dateInput) dateInput.value = now.toISOString().slice(0, 16);

updateSyncBadge();
