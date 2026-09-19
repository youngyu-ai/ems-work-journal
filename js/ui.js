// EMS PWA 3.1
// Generated modular frontend.

let selectedTags=[];
let stagedFiles=[];
let followupFiles=[];
let activeFollowupRecord=null;
let activeEditRecord=null;
window.latestSearchResults=[];

function setPwaStatus(text){ const el=document.getElementById('pwaStatusText'); if(el) el.textContent=text; }

function showPwaUpdate(){ const b=document.getElementById('pwaUpdateBtn'); if(b) b.style.display='inline-block'; setPwaStatus('發現新版本'); }

function applyPwaUpdate(){ navigator.serviceWorker.getRegistration().then(reg=>{ if(reg && reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'}); }); }
    window.addEventListener('online',()=>setPwaStatus('PWA 已啟用 · 線上'));
    window.addEventListener('offline',()=>setPwaStatus('PWA 已啟用 · 離線 · 可查看快取資料'));

function showSection(type) {
      document.getElementById('homeView').style.display = 'none';
      document.getElementById('section-memo').style.display = type === 'memo' ? 'block' : 'none';
      document.getElementById('section-task').style.display = type === 'task' ? 'block' : 'none';
      document.getElementById('section-search').style.display = type === 'search' ? 'block' : 'none';
    }

function goHome() {
      document.getElementById('homeView').style.display = 'block';
      document.getElementById('section-memo').style.display = 'none';
      document.getElementById('section-task').style.display = 'none';
      document.getElementById('section-search').style.display = 'none';
      loadTasks();
    }

function toggleTag(el, tag) {
      el.classList.toggle('active');
      if (selectedTags.includes(tag)) {
        selectedTags = selectedTags.filter(t => t !== tag);
      } else {
        selectedTags.push(tag);
      }
    }

    /* 多檔案選取與清單管理 */

function handleFilesSelected(files) {
      if (!files || files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        stagedFiles.push({ file: f, name: f.name, size: f.size, type: f.type });
      }
      renderFileList();
      document.getElementById('filePicker').value = '';
    }

function removeFile(index) {
      stagedFiles.splice(index, 1);
      renderFileList();
    }

function renderFileList() {
      const container = document.getElementById('fileList');
      if (stagedFiles.length === 0) { container.innerHTML = ''; return; }
      container.innerHTML = stagedFiles.map((f, idx) => {
        const sizeMB = (f.size / (1024 * 1024)).toFixed(1);
        const isLarge = f.size > 7 * 1024 * 1024;
        return `
          <div class="file-chip">
            <div class="file-chip-info">
              <span>📎</span>
              <span class="file-name" title="${f.name}">${f.name}</span>
              <span class="file-badge ${isLarge ? 'large' : ''}">${sizeMB} MB</span>
            </div>
            <button class="btn-file-del" onclick="removeFile(${idx})">🗑️</button>
          </div>
        `;
      }).join('');
    }

    /* 待辦事項 */

function setProgress(percent, text) {
      document.getElementById('progressBar').style.width = percent + '%';
      document.getElementById('progressPercent').innerText = percent + '%';
      if (text) document.getElementById('progressStatus').innerText = text;
    }

    /* 40MB+ 大檔案分塊上傳與發布 */

function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
