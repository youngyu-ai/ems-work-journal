import { callGasApi } from './api.js';

export async function optimizeImage(file) {
  if (!file || file.type !== 'image/jpeg' || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 2048;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1) { bitmap.close(); return file; }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82));
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '_opt.jpg', {
      type: 'image/jpeg'
    });
  } catch (e) {
    return file;
  }
}

export async function uploadSingleFileParallel(file, year, onProgress) {
  const readyFile = await optimizeImage(file);
  const size = readyFile.size;
  const name = readyFile.name;
  const type = readyFile.type || 'application/octet-stream';

  if (size <= 4 * 1024 * 1024) {
    const b64 = await toBase64(readyFile);
    return await callGasApi('saveFileDirect', {
      fileName: name,
      fileType: type,
      fileData: b64,
      year
    });
  }

  const chunkSize = 2.5 * 1024 * 1024;
  const totalChunks = Math.ceil(size / chunkSize);
  const uploadId = 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  let finishedChunks = 0;

  const chunkTasks = Array.from({ length: totalChunks }, (_, idx) => async () => {
    const start = idx * chunkSize;
    const end = Math.min((idx + 1) * chunkSize, size);
    const chunkBlob = readyFile.slice(start, end);
    const chunkB64 = await toBase64(chunkBlob);

    await callGasApi('saveFileChunk', {
      uploadId,
      chunkIndex: idx,
      totalChunks,
      fileName: name,
      fileType: type,
      fileSize: size,
      base64Chunk: chunkB64,
      year
    });

    finishedChunks++;
    if (onProgress) onProgress((finishedChunks / totalChunks) * 0.9);
  });

  await runPool(chunkTasks, 3);

  if (onProgress) onProgress(0.95);
  return await callGasApi('finalizeFileUpload', {
    uploadId,
    totalChunks,
    fileName: name,
    fileType: type,
    fileSize: size,
    year
  });
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function runPool(tasks, limit) {
  const executing = [];
  for (const task of tasks) {
    const p = task().then(() => executing.splice(executing.indexOf(p), 1));
    executing.push(p);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(executing);
}
