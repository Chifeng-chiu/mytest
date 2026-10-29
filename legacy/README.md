# 舊版單檔備份

這個資料夾保留重構前的原始版本，僅供對照與備份：

- `index.html`：原本的單檔長輩關懷 App
- `manifest.json`：舊版 PWA manifest
- `sw.js`：舊版 Service Worker
- `icons/`：舊版圖示

目前正式運作的版本是根目錄的 `server.js` 搭配 `public/`。伺服器只會服務 `public/`，不會載入這個資料夾。

若只是想看舊版畫面，可直接開啟 `legacy/index.html`；但 `file://` 模式不支援 PWA 安裝與 Service Worker，且舊版資料只存在瀏覽器內。
