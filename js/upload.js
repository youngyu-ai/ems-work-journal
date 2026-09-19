// EMS PWA 3.1
// Generated modular frontend.

async function optimizeUploadFile(file){
      if(!file || file.type!=='image/jpeg' || file.size<1.5*1024*1024)return file;
      try{const b=await createImageBitmap(file),max=2000,scale=Math.min(1,max/Math.max(b.width,b.height));if(scale>=1){b.close();return file;}const c=document.createElement('canvas');c.width=Math.round(b.width*scale);c.height=Math.round(b.height*scale);c.getContext('2d').drawImage(b,0,0,c.width,c.height);b.close();const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.8));if(!blob||blob.size>=file.size*.9)return file;return new File([blob],file.name.replace(/\.[^.]+$/,'')+'_optimized.jpg',{type:'image/jpeg',lastModified:Date.now()});}catch(e){return file;}
    }

async function uploadOneFile(item,year,prefix,progress){
      const file=await optimizeUploadFile(item.file), size=file.size, name=file.name, type=file.type||item.type||'application/octet-stream';

      // 4MB 以下：維持直接上傳，避免小檔案反而產生分塊開銷。
      if(size<=4*1024*1024){
        const dataUrl=await readFileAsDataURL(file);
        const result=await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).saveFileDirect({fileName:name,fileType:type,fileData:dataUrl,year}));
        if(!result.success)throw new Error(result.message||'檔案上傳失敗');
        progress(1,name);
        return result;
      }

      // 4MB 以上：分塊「並行」上傳，全部完成後才 finalize / merge。
      const chunkSize=2.5*1024*1024;
      const total=Math.ceil(size/chunkSize);
      const uploadId=prefix+Date.now()+'_'+Math.random().toString(36).substr(2,9);
      const chunkConcurrency=Math.min(3,total);
      let nextChunk=0, completedChunks=0;
      const chunkResults=new Array(total);

      const uploadChunk=async()=>{
        while(true){
          const c=nextChunk++;
          if(c>=total)return;
          const start=c*chunkSize;
          const end=Math.min((c+1)*chunkSize,size);
          const blob=file.slice(start,end);
          const b64=await readFileAsDataURL(blob);
          const result=await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).saveFileChunk({
            uploadId:uploadId,
            chunkIndex:c,
            totalChunks:total,
            fileName:name,
            fileType:type,
            fileSize:size,
            base64Chunk:b64,
            year:year
          }));
          if(!result || !result.success)throw new Error((result&&result.message)||('第 '+(c+1)+' 塊上傳失敗'));
          chunkResults[c]=result;
          completedChunks++;
          progress(completedChunks/total*0.92,name);
        }
      };

      await Promise.all(Array.from({length:chunkConcurrency},()=>uploadChunk()));

      progress(0.95,name+'：分塊完成，正在合併...');
      const finalResult=await new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).finalizeFileUpload({
        uploadId:uploadId,
        totalChunks:total,
        fileName:name,
        fileType:type,
        fileSize:size,
        year:year
      }));
      if(!finalResult || !finalResult.success)throw new Error((finalResult&&finalResult.message)||'檔案合併失敗');
      progress(1,name);
      return finalResult;
    }

    // 檔案層級最多 2 路並行；每個大檔案內部最多 3 個 chunk 並行。
    // 避免 3 個大檔案 × 3 chunks 同時打 GAS，造成過高併發。

async function uploadFilesConcurrent(items,year,prefix,onProgress){
      const results=new Array(items.length);
      let next=0,done=0;
      const fileConcurrency=Math.min(2,Math.max(1,items.length));
      const worker=async()=>{
        while(true){
          const i=next++;
          if(i>=items.length)return;
          results[i]=await uploadOneFile(items[i],year,prefix,(fraction,name)=>onProgress(i,fraction,name,done,items.length));
          done++;
          onProgress(i,1,items[i].name,done,items.length);
        }
      };
      await Promise.all(Array.from({length:fileConcurrency},worker));
      return results;
    }

    window.onload = function() {
      registerEMSServiceWorker();
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      document.getElementById('eventDate').value = now.toISOString().slice(0, 16);
      loadTasks();
    };

    document.getElementById('followupModal').addEventListener('click', function(e){ if(e.target===this) closeFollowupModal(); });
    document.getElementById('editModal').addEventListener('click', function(e){ if(e.target===this) closeEditModal(); });

function readFileAsDataURL(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
      });
    }

    /* 搜尋日誌（支援關鍵字、日期範圍過濾與開啟附件按鈕） */
