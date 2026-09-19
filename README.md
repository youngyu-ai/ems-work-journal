# EMS PWA 3.1

## 本版修正
- 修正日期搜尋查無紀錄問題：日期索引為空或日期篩選零結果時，GAS 會自動重建 SearchIndex 後重新搜尋。
- IndexedDB 搜尋快取升版為 `EMSLogCacheV3`，避免舊版空結果快取持續影響日期搜尋。
- 前端拆分為 `db.js / api.js / ui.js / upload.js / search.js / app.js`。
- `sw.js` 更新至 `ems-pwa-3.1.0`，App Shell 預快取模組化 JS 與圖示。
- 保留 GitHub Pages + GAS Web App API 架構。

## GitHub 結構
```text
index.html
manifest.json
sw.js
Code.gs
js/
  db.js
  api.js
  ui.js
  upload.js
  search.js
  app.js
assets/
  icon-192.png
  icon-512.png
```

## GAS
1. 將 `Code.gs` 內容部署到 Google Apps Script。
2. 建立「網頁應用程式」部署。
3. 將 Web App `/exec` URL 填入 `js/api.js` 的 `EMS_API_URL`。
4. API Token 維持與 GAS `PWA_API_TOKEN` 相同。

## GitHub Pages
把整個資料夾內容放入 repository root 或 Pages 指定目錄，並啟用 HTTPS。

## 日期搜尋修正原理
SearchIndex 的 `date` 欄位由 Google Docs 原始日誌重新解析建立。當日期查詢發現索引沒有有效日期，或指定日期完全沒有結果時，系統會呼叫 `rebuildSearchIndex()`，再執行一次篩選，因此不會被舊索引卡住。
