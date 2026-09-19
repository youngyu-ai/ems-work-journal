# EMS PWA 3.0

## 1. GitHub Pages
將以下檔案放在同一個 GitHub Pages 專案：
- index.html
- manifest.json
- sw.js
- assets/icon-192.png
- assets/icon-512.png

## 2. GAS Web App
將 `Code.gs_更新版.gs` 部署為 Web App：
- Execute as: Me
- Who has access: Anyone with the link（依你的 Google Workspace 政策調整）
- 取得 `/exec` URL

## 3. 設定 API URL
開啟 `index.html`，找到：
`const EMS_API_URL = 'https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec';`

把它改成你的 GAS Web App `/exec` URL。

API Token 必須與 Code.gs 的 `PWA_API_TOKEN` 一致。

## 4. GAS 更新
把 `Code.gs_更新版.gs` 的完整內容貼回 Apps Script 專案，儲存後建立新部署版本。

## 5. PWA
GitHub Pages 必須使用 HTTPS。第一次開啟後 Service Worker 會快取 App Shell；瀏覽器支援時即可安裝成獨立 App。

## 6. 本版修正
- 編輯／刪除／後續處理增加 `entryKey` 精準定位。
- 若舊資料沒有 entryKey，會以「日期＋時間＋標題」比對；日期格式不一致時再使用唯一的「時間＋標題」備援。
- 避免編輯後標題改變造成下一次無法定位。
- PWA App Shell Cache。
- PWA 更新提示。
- 線上／離線狀態提示。
- 保留 IndexedDB 搜尋快取。
- 大檔案 Chunk 並行上傳。
- 後續處理附件改用同一套 Chunk + finalize 機制。
