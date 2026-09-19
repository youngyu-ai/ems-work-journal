// EMS PWA 3.1
// Application bootstrap and memo/task actions.

// PWA lifecycle
function registerEMSServiceWorker(){
  if(!('serviceWorker' in navigator)){setPwaStatus('瀏覽器不支援 PWA');return;}
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    if(reg.waiting) showPwaUpdate();
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showPwaUpdate();});});
    navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload());
    setPwaStatus(navigator.onLine?'PWA 已啟用 · 線上':'PWA 已啟用 · 離線');
  }).catch(e=>{setPwaStatus('PWA 啟動失敗');console.error(e);});
}

function loadTasks() {
      const container = document.getElementById('taskList');
      container.innerHTML = '<div style="color:#666; font-size:14px; text-align:center;">同步待辦事項中...</div>';
      google.script.run.withSuccessHandler(tasks => {
        if (!tasks || tasks.length === 0) {
          container.innerHTML = '<div style="color:#666; font-size:14px; text-align:center; padding:10px;">🎉 目前無未完成的消防待辦事項</div>';
          return;
        }
        container.innerHTML = tasks.map(t => `
          <div class="task-item" id="task-${t.id}">
            <input type="checkbox" class="task-checkbox" onchange="completeTask('${t.id}')">
            <div class="task-content">
              <div class="task-title">${t.title}</div>
              ${t.notes ? `<div class="task-notes">${t.notes}</div>` : ''}
              ${t.due ? `<div class="task-due">📅 到期日：${t.due}</div>` : ''}
            </div>
          </div>
        `).join('');
      }).getFireTasks();
    }

function completeTask(taskId) {
      if (taskId === 'error') return;
      const el = document.getElementById(`task-${taskId}`);
      if (el) el.classList.add('fade-out');
      google.script.run.withSuccessHandler(res => {
        setTimeout(() => { 
          if (el) el.remove(); 
          if (document.querySelectorAll('.task-item:not(.fade-out)').length === 0) {
            document.getElementById('taskList').innerHTML = '<div style="color:#666; font-size:14px; text-align:center; padding:10px;">🎉 目前無未完成的消防待辦事項</div>';
          }
        }, 300);
      }).completeFireTask(taskId);
    }

function submitTask() {
      const title = document.getElementById('taskTitle').value.trim();
      const due = document.getElementById('taskDue').value;
      const notes = document.getElementById('taskNotes').value.trim();
      if (!title) return alert('請輸入待辦標題！');

      google.script.run.withSuccessHandler(res => {
        alert(res.message);
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDue').value = '';
        document.getElementById('taskNotes').value = '';
        goHome();
      }).addFireTask({ title, due, notes });
    }

async function submitMemo() {
      const title = document.getElementById('title').value.trim();
      const content = document.getElementById('content').value.trim();
      const date = document.getElementById('eventDate').value;
      if (!title) return alert('請輸入標題！');

      let finalTags = [...selectedTags];
      const customInput = document.getElementById('customTags').value.trim();
      if (customInput) {
        const splitTags = customInput.split(/[\s,，]+/);
        splitTags.forEach(t => {
          const clean = t.replace(/^#/, '').trim();
          if (clean && !finalTags.includes(clean)) {
            finalTags.push(clean);
          }
        });
      }

      const eventDate = date ? new Date(date) : new Date();
      const year = eventDate.getFullYear();

      const modal = document.getElementById('progressModal');
      modal.style.display = 'flex';
      setProgress(5, '準備處理檔案...');

      const uploadedFilesInfo = [];
      const totalFiles = stagedFiles.length;

      try {
        if (totalFiles) {
          const uploaded = await uploadFilesConcurrent(stagedFiles, year, 'up_', (idx, fraction, name, completed, total) => {
            setProgress(Math.min(90, Math.round(((completed + fraction * 0.9) / total) * 85) + 5), `正在上傳 ${name} (${Math.round(fraction*100)}%) · ${completed}/${total}`);
          });
          uploadedFilesInfo.push(...uploaded);
        }

        setProgress(95, '正在寫入 Google 文件與日誌...');
        const memoRes = await new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .saveMemoDoc({
              title: title,
              content: content,
              date: date,
              tags: finalTags,
              uploadedFiles: uploadedFilesInfo
            });
        });

        if (!memoRes.success) throw new Error(memoRes.message);

        setProgress(100, '處理完成！');
        setTimeout(() => {
          modal.style.display = 'none';
          alert(memoRes.message);
          document.getElementById('title').value = '';
          document.getElementById('content').value = '';
          document.getElementById('customTags').value = '';
          stagedFiles = [];
          renderFileList();
          selectedTags = [];
          document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
          goHome();
        }, 400);

      } catch (err) {
        modal.style.display = 'none';
        alert('儲存失敗：' + err);
      }
    }

function registerEMSServiceWorker(){
  if(!('serviceWorker' in navigator)){setPwaStatus('瀏覽器不支援 PWA');return;}
  navigator.serviceWorker.register('./sw.js').then(reg=>{
    if(reg.waiting) showPwaUpdate();
    reg.addEventListener('updatefound',()=>{const w=reg.installing;if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showPwaUpdate();});});
    navigator.serviceWorker.addEventListener('controllerchange',()=>window.location.reload());
    setPwaStatus(navigator.onLine?'PWA 已啟用 · 線上':'PWA 已啟用 · 離線');
  }).catch(e=>{setPwaStatus('PWA 啟動失敗');console.error(e);});
}

window.addEventListener('DOMContentLoaded',()=>{
  createGasApiShim();
  registerEMSServiceWorker();
  const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
  const el=document.getElementById('eventDate');if(el)el.value=now.toISOString().slice(0,16);
  const fm=document.getElementById('followupModal');if(fm)fm.addEventListener('click',e=>{if(e.target===fm)closeFollowupModal();});
  const em=document.getElementById('editModal');if(em)em.addEventListener('click',e=>{if(e.target===em)closeEditModal();});
  loadTasks();
});
window.addEventListener('online',()=>setPwaStatus('PWA 已啟用 · 線上'));
window.addEventListener('offline',()=>setPwaStatus('PWA 已啟用 · 離線 · 可查看快取資料'));

window.addEventListener('DOMContentLoaded',()=>{
  createGasApiShim();
  registerEMSServiceWorker();
  const now=new Date();now.setMinutes(now.getMinutes()-now.getTimezoneOffset());
  const el=document.getElementById('eventDate');if(el)el.value=now.toISOString().slice(0,16);
  const fm=document.getElementById('followupModal');if(fm)fm.addEventListener('click',e=>{if(e.target===fm)closeFollowupModal();});
  const em=document.getElementById('editModal');if(em)em.addEventListener('click',e=>{if(e.target===em)closeEditModal();});
  loadTasks();
});
window.addEventListener('online',()=>setPwaStatus('PWA 已啟用 · 線上'));
window.addEventListener('offline',()=>setPwaStatus('PWA 已啟用 · 離線 · 可查看快取資料'));
