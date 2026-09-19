// EMS PWA 3.1
// Generated modular frontend.

function clearSearchFilter() {
      document.getElementById('searchKey').value = '';
      document.getElementById('searchStartDate').value = '';
      document.getElementById('searchEndDate').value = '';
      document.getElementById('searchResults').innerHTML = '';
    }

async function performSearch(options) {
      const query = document.getElementById('searchKey').value.trim();
      const startDate = document.getElementById('searchStartDate').value;
      const endDate = document.getElementById('searchEndDate').value;
      const forceRefresh = !!(options && options.forceRefresh);
      const cacheKey = searchCacheKey(query,startDate,endDate);

      // 前端先檢查日期區間
      if (startDate && endDate && startDate > endDate) {
        alert('開始日期不可晚於結束日期！');
        return;
      }

      const container = document.getElementById('searchResults');
      container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">搜尋中...</div>';

      if (!forceRefresh) {
        const cached = await getSearchCache(cacheKey);
        if (cached) {
          // 直接重用既有結果渲染邏輯
          window.latestSearchResults = cached;
          const fake = { value: null };
          const event = new CustomEvent('ems-cache-search', {detail:cached});
          document.dispatchEvent(event);
          renderSearchResults(cached, container);
          return;
        }
      }

      google.script.run
        .withSuccessHandler(async results => {
          await setSearchCache(cacheKey, results);
          renderSearchResults(results, container);
        })
        .withFailureHandler(error => {
          container.innerHTML =
            '<div style="color:#d93025; text-align:center; padding:16px;">' +
            '搜尋失敗：' + escapeHtml(error && error.message ? error.message : String(error)) +
            '</div>';
        })
        .searchHistory({ query, startDate, endDate });
    }

function renderSearchResults(results, container) {
        if (!results || results.length === 0) {
          container.innerHTML = '<div style="color:#666; text-align:center; padding:16px;">查無符合條件之紀錄</div>';
          return;
        }

        // 後端錯誤訊息
        if (results.length === 1 &&
            results[0].lines &&
            results[0].lines.length === 1 &&
            results[0].lines[0].indexOf('搜尋失敗：') === 0) {
          container.innerHTML =
            '<div style="color:#d93025; text-align:center; padding:16px;">' +
            escapeHtml(results[0].lines[0]) +
            '</div>';
          return;
        }

        container.innerHTML = results.map((r, idx) => {
          const textHtml = (r.lines || []).map(line => {
            const safeLine = escapeHtml(line);
            const formatted = safeLine.replace(
              /(https?:\/\/[^\s<]+)/g,
              '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#1a73e8; word-break:break-all;">$1</a>'
            );
            return `<div>${formatted}</div>`;
          }).join('');

          let linksHtml = '';
          if (r.links && r.links.length > 0) {
            linksHtml = '<div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">' +
              r.links.map(l => `
                <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer" class="search-file-btn">
                  <span>📎</span>
                  <span style="flex:1; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">開啟檔案：${escapeHtml(l.name)}</span>
                  <span style="font-size:12px;">↗</span>
                </a>
              `).join('') + '</div>';
          }

          const meta = (r.date || r.time) ? `<div class="result-meta">${escapeHtml(r.date || '')}${r.time ? '  ·  ' + escapeHtml(r.time) : ''}</div>` : '';
          const actionButtons = (r.title && r.time)
            ? `<div class="result-actions">
                 <button class="result-action followup" onclick="openFollowupModal(${idx})">➕ 新增後續處理</button>
                 <button class="result-action edit" onclick="openEditModal(${idx})">✏️ 編輯內容</button>
                 <button class="result-action delete" onclick="deleteHistory(${idx})">🗑️ 刪除紀錄</button>
               </div>` : '';
          return `<div class="result-item">${meta}${textHtml}${linksHtml}${actionButtons}</div>`;
        }).join('');

        window.latestSearchResults = results;
    }

function openEditModal(index) {
      const record = (window.latestSearchResults || [])[index];
      if (!record || !record.title || !record.time) {
        alert('此筆紀錄缺少標題或發布時間，無法精準定位。');
        return;
      }

      activeEditRecord = {
        entryKey: record.entryKey || '',
        date: record.date || '',
        time: record.time || '',
        title: record.title || ''
      };

      document.getElementById('editTitle').value = record.title || '';

      const tags = [];
      (record.lines || []).forEach(function(line) {
        if (String(line).indexOf('標籤：') === 0) {
          String(line.substring(3)).trim().split(/[\s,，]+/).forEach(function(t) {
            if (t) tags.push(t.replace(/^#/, ''));
          });
        }
      });
      document.getElementById('editTags').value = tags.join(' ');

      let contentLines = [];
      const lines = record.lines || [];
      let inContent = false;
      lines.forEach(function(line) {
        const text = String(line);
        if (text.indexOf('說明：') === 0) {
          inContent = true;
          contentLines.push(text.substring(3));
          return;
        }
        if (inContent) {
          if (text.indexOf('📎 附件檔案：') === 0 ||
              text.indexOf('【後續處理｜') === 0 ||
              text.indexOf('修改時間：') === 0 ||
              text.indexOf('最後修改：') === 0) {
            inContent = false;
            return;
          }
          contentLines.push(text);
        }
      });

      document.getElementById('editContent').value = contentLines.join('\n');
      document.getElementById('editReference').innerHTML =
        '<strong>原始標題：</strong>' + escapeHtml(record.title) +
        '<br><strong>發布時間：</strong>' + escapeHtml(record.time) +
        (record.date ? '<br><strong>日誌日期：</strong>' + escapeHtml(record.date) : '');

      document.getElementById('editModal').style.display = 'flex';
      setTimeout(() => document.getElementById('editTitle').focus(), 80);
    }

function closeEditModal() {
      document.getElementById('editModal').style.display = 'none';
      activeEditRecord = null;
    }

async function submitEditHistory() {
      if (!activeEditRecord) return;

      const newTitle = document.getElementById('editTitle').value.trim();
      const newContent = document.getElementById('editContent').value;
      const newTags = document.getElementById('editTags').value
        .split(/[\s,，]+/)
        .map(t => t.replace(/^#/, '').trim())
        .filter(Boolean);

      if (!newTitle) {
        alert('標題不可為空白！');
        return;
      }

      const record = activeEditRecord;
      const modal = document.getElementById('progressModal');
      modal.style.display = 'flex';
      setProgress(35, '正在更新日誌內容...');

      try {
        const result = await new Promise((resolve, reject) => {
          google.script.run
            .withSuccessHandler(resolve)
            .withFailureHandler(reject)
            .editHistoryEntry({
              entryKey: record.entryKey || '',
              date: record.date,
              time: record.time,
              title: record.title,
              newTitle: newTitle,
              newContent: newContent,
              newTags: newTags
            });
        });

        if (!result.success) throw new Error(result.message || '編輯失敗');

        setProgress(100, '修改完成');
        setTimeout(() => {
          modal.style.display = 'none';
          closeEditModal();
          alert(result.message + (result.modifiedTime ? '\n修改時間：' + result.modifiedTime : ''));
          clearSearchCache().then(() => performSearch({forceRefresh:true}));
        }, 350);
      } catch (err) {
        modal.style.display = 'none';
        alert('編輯失敗：' + (err && err.message ? err.message : err));
      }
    }

function deleteHistory(index) {
      const record = (window.latestSearchResults || [])[index];
      if (!record || !record.title || !record.time) {
        alert('此筆紀錄缺少標題或發布時間，無法精準定位。');
        return;
      }

      const preview = record.title + (record.date ? '\n' + record.date : '') +
        (record.time ? ' ' + record.time : '');

      if (!confirm('確定要刪除這筆日誌紀錄嗎？\n\n' + preview +
                   '\n\n※ 這會刪除原始紀錄及其「後續處理」內容；已上傳至 Google Drive 的附件檔案不會同步刪除。')) {
        return;
      }

      google.script.run
        .withSuccessHandler(result => {
          if (!result || !result.success) {
            alert((result && result.message) || '刪除失敗');
            return;
          }
          alert(result.message);
          clearSearchCache().then(() => performSearch({forceRefresh:true}));
        })
        .withFailureHandler(error => {
          alert('刪除失敗：' + (error && error.message ? error.message : String(error)));
        })
        .deleteHistoryEntry({
          date: record.date || '',
          time: record.time || '',
          title: record.title || ''
        });
    }

function openFollowupModal(index) {
      const record = (window.latestSearchResults || [])[index];
      if (!record || !record.title || !record.time) { alert('此筆紀錄缺少標題或發布時間，無法精準定位。'); return; }
      activeFollowupRecord = { entryKey:record.entryKey || '', date:record.date || '', time:record.time || '', title:record.title || '' };
      followupFiles = [];
      document.getElementById('followupText').value = '';
      document.getElementById('followupFilePicker').value = '';
      document.getElementById('followupReference').innerHTML = '<strong>原始標題：</strong>' + escapeHtml(activeFollowupRecord.title) + '<br><strong>發布時間：</strong>' + escapeHtml(activeFollowupRecord.time) + (activeFollowupRecord.date ? '<br><strong>日誌日期：</strong>' + escapeHtml(activeFollowupRecord.date) : '');
      renderFollowupFileList();
      document.getElementById('followupModal').style.display = 'flex';
      setTimeout(() => document.getElementById('followupText').focus(), 80);
    }

function closeFollowupModal() {
      document.getElementById('followupModal').style.display = 'none';
      activeFollowupRecord = null; followupFiles = []; renderFollowupFileList();
    }

function handleFollowupFilesSelected(files) {
      if (!files || !files.length) return;
      for (let i = 0; i < files.length; i++) { const f = files[i]; followupFiles.push({file:f,name:f.name,size:f.size,type:f.type}); }
      renderFollowupFileList(); document.getElementById('followupFilePicker').value = '';
    }

function removeFollowupFile(index) { followupFiles.splice(index,1); renderFollowupFileList(); }

function renderFollowupFileList() {
      const container = document.getElementById('followupFileList');
      if (!container) return;
      if (!followupFiles.length) { container.innerHTML = '<div class="followup-empty">尚未選擇附件</div>'; return; }
      container.innerHTML = followupFiles.map((f,idx) => {
        const sizeMB=(f.size/(1024*1024)).toFixed(1), large=f.size>7*1024*1024;
        return `<div class="file-chip"><div class="file-chip-info"><span>📎</span><span class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span><span class="file-badge ${large?'large':''}">${sizeMB} MB</span></div><button class="btn-file-del" onclick="removeFollowupFile(${idx})">×</button></div>`;
      }).join('');
    }

async function submitFollowup() {
      if (!activeFollowupRecord) return;
      const followUpText=document.getElementById('followupText').value.trim();
      if (!followUpText && !followupFiles.length) { alert('請至少填寫後續處理說明或上傳一個附件。'); return; }
      const record=activeFollowupRecord;
      const year=record.date ? parseInt(record.date.slice(0,4),10) : new Date().getFullYear();
      const modal=document.getElementById('progressModal'); modal.style.display='flex'; setProgress(3,'準備追加後續處理...');
      const uploadedFilesInfo=[];
      try {
        const totalFiles=followupFiles.length;
        if (totalFiles) {
          const uploaded = await uploadFilesConcurrent(followupFiles, year, 'fu_', (idx, fraction, name, completed, total) => {
            setProgress(Math.min(90, Math.round(((completed + fraction * 0.9) / total) * 82) + 5), `正在上傳 ${name} (${Math.round(fraction*100)}%) · ${completed}/${total}`);
          });
          uploadedFilesInfo.push(...uploaded);
        }
        setProgress(94,'正在精準追加至原始日誌位置...');
        const result=await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).appendFollowUpToHistory({entryKey:record.entryKey || '',date:record.date,time:record.time,title:record.title,followUpText:followUpText,uploadedFiles:uploadedFilesInfo}));
        if(!result.success) throw new Error(result.message||'追加失敗');
        setProgress(100,'追加完成');
        setTimeout(()=>{ modal.style.display='none'; closeFollowupModal(); alert(result.message+(result.modifiedTime?'\n修改時間：'+result.modifiedTime:'')); performSearch(); },350);
      } catch(err) { modal.style.display='none'; alert('追加失敗：'+(err&&err.message?err.message:err)); }
    }

    // 搜尋結果輸出前進行 HTML Escape
