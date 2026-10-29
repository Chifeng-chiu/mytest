# 樂活在地通｜長輩關懷 PWA（前後端分離版）

這個版本把原本的單檔 `index.html` 拆成「長輩端」與「佳儒後台」兩個前端，並加上一個零外部依賴的 Node.js 伺服器。資料不再只存在瀏覽器裡，而是由伺服器統一保存到 `data/db.json`，兩個視窗可以即時同步。

- 長輩端：`http://localhost:8080/elder.html`（可安裝成 PWA）
- 佳儒後台：`http://localhost:8080/admin.html`（一般網頁）
- 根路徑 `http://localhost:8080/` 會直接開啟長輩端

## 目錄結構

```text
長者APP/
├─ server.js                 # 零依賴 Node.js 伺服器：靜態檔案、REST API、SSE
├─ README-PWA.md
├─ data/
│  ├─ seed.json              # 示範資料母本；按「重設 Demo」時會從這裡還原
│  └─ db.json                # 目前運作中的資料；伺服器啟動後自動建立／載入
├─ public/
│  ├─ elder.html             # 長輩端（PWA）
│  ├─ admin.html             # 佳儒後台
│  ├─ manifest.json          # 長輩端 PWA manifest
│  ├─ sw.js                  # Service Worker（App Shell 快取）
│  ├─ css/
│  │  └─ styles.css          # 共用視覺樣式
│  ├─ js/
│  │  ├─ api.js              # API 呼叫、localStorage 快取、離線佇列、SSE／輪詢
│  │  ├─ elder.js            # 長輩端互動邏輯
│  │  └─ admin.js            # 後台互動邏輯
│  └─ icons/                 # PWA 圖示
└─ legacy/                   # 原始單檔版本備份（伺服器不會使用；部署壓縮檔不含）
```

## 快速啟動

### 需求

- Node.js 18 以上（建議 20／22／24）
- 不需要 `npm install`，伺服器只使用 Node.js 內建模組

### 啟動

在專案資料夾執行：

```powershell
cd "C:\Users\user\OneDrive\Desktop\長者APP"
node server.js
```

看到啟動訊息後，開啟：

- 長輩端：<http://localhost:8080/elder.html>
- 佳儒後台：<http://localhost:8080/admin.html>

如果要換連接埠：

```powershell
$env:PORT = 3000
node server.js
```

macOS／Linux：

```bash
PORT=3000 node server.js
```

> 請不要直接雙擊 `public/elder.html` 或 `public/admin.html`。`file://` 開啟時沒有後端 API，Service Worker 也無法運作；請一律透過 `node server.js` 啟動。

## 兩個入口怎麼用

### 長輩端 `elder.html`

- 大字／特大字切換：固定在頁面上方，會記住選擇
- 緊急求助 SOS：按下後建立求助紀錄，後台會立即看到
- 佳儒的叮嚀：查看提醒、語音朗讀、回報完成
- 老友照片牆：上傳照片、按讚、錄音／語音介紹、參加老友湊咖
- 健康步數：模擬計步、金幣獎勵、每日問答、兌換獎勵
- 社區廣播站：里長廣播、共餐報名、接駁車預約、老友湊咖
- 沒有「切換到後台」的按鈕；長輩端只保留長輩需要的功能

### 佳儒後台 `admin.html`

- 右上角「重設 Demo」：一鍵回到 `data/seed.json` 的初始狀態
- SOS 求助：查看待處理警報、位置與時間，按「📞 已聯繫並解除警報」結案
- 提醒發布與完成追蹤：可指定班級、時間、類型，查看每位長輩的回報進度
- 共餐名單、接駁車名單、老友湊咖名單
- 社區廣播發布：新增里長廣播，長輩端會即時收到
- 連線狀態：顯示即時同步中或目前離線

## 跨視窗即時同步

- 後端以 Server-Sent Events（SSE）推送完整狀態：`GET /api/events`
- 前端若 SSE 中斷，會自動改用每 3 秒輪詢 `GET /api/state`
- 任一視窗送出修改後，伺服器會立刻廣播給所有已連線的視窗
- 長輩端與後台可以並排開啟，適合示範「長輩按下求助 → 後台立即跳出警報」

### 並排示範步驟

1. 執行 `node server.js`。
2. 開兩個瀏覽器視窗，一個開 `elder.html`，一個開 `admin.html`，並排放在螢幕左右。
3. 在長輩端按「緊急求助」，後台會出現 SOS 警報。
4. 在後台按「📞 已聯繫並解除警報」，長輩端下次同步時會看到狀態更新。
5. 在後台發布提醒或廣播，長輩端約 1 秒內（最慢 3 秒）更新。
6. 在後台右上角按「重設 Demo」，兩個視窗都會回到初始資料。

## 資料保存與重設

- `data/db.json` 是正式運作資料，伺服器每次修改都會以「先寫暫存檔、再重新命名」的方式原子寫入，降低檔案寫壞的風險。
- `data/seed.json` 是示範資料母本，不會被修改。
- 後台右上角「重設 Demo」會呼叫 `POST /api/reset`，把 `db.json` 還原成 `seed.json`，並立即廣播給所有視窗。
- 重設後 `revision` 會繼續遞增，不會讓已開啟的視窗誤判成舊資料。
- 若 `data/db.json` 損壞或想手動重來，可先停止伺服器，刪除 `db.json`，再重新啟動；伺服器會從 `seed.json` 建立新檔。

目前示範資料：

- 長輩：林阿公（長青A班）
- 示範照片：3 張 SVG 圖
- 提醒：2 則
- 廣播：3 則
- 共餐：36 人
- 老友湊咖：2 組
- 接駁車：醫院線、市場線

## API 一覽

所有修改類 API 都會回傳完整的 `state`，前端可直接用這份狀態重繪。請求與回應皆為 JSON（SSE 除外）。

| 方法 | 路徑 | 用途 | 主要請求內容 |
| --- | --- | --- | --- |
| GET | `/api/state` | 取得目前完整狀態 | 無 |
| GET | `/api/events` | SSE 即時狀態推送 | 無 |
| POST | `/api/reset` | 重設為示範資料 | 無 |
| POST | `/api/reminders` | 發布提醒 | `content`、`time`、`group`、`type`、`note` |
| POST | `/api/reminders/:id/complete` | 回報提醒完成 | `elderName` |
| POST | `/api/sos` | 建立 SOS 求助 | `elderName`、`location` |
| POST | `/api/sos/resolve` | 解除 SOS | `id`（可省略，省略時解除最新待處理） |
| POST | `/api/photos` | 新增照片 | `title`、`image`（data URL）、`author` |
| POST | `/api/photos/:id/like` | 照片按讚／取消讚 | 無 |
| POST | `/api/photos/:id/voice` | 儲存照片語音介紹文字 | `voiceText` |
| POST | `/api/health/steps` | 新增步數與金幣 | `amount` |
| POST | `/api/health/redeem` | 兌換獎勵 | `rewardId` |
| POST | `/api/health/quiz` | 回答或切換每日問答 | `questionId`、`optionIndex`，或 `action: "next"` |
| POST | `/api/community/meal` | 報名共餐 | `elderName` |
| POST | `/api/community/gathering` | 參加老友湊咖 | `gatheringId`、`elderName` |
| POST | `/api/community/shuttle` | 預約／取消接駁車 | `key`（`hospital` 或 `market`）、`elderName` |
| POST | `/api/notices` | 發布社區廣播 | `title`、`body`、`category`、`icon`、`meta` |

範例：

```powershell
# 取得狀態
curl.exe http://localhost:8080/api/state

# 發布提醒
curl.exe -X POST http://localhost:8080/api/reminders `
  -H "Content-Type: application/json" `
  -d '{"content":"下午三點量血壓","time":"15:00","group":"長青A班","type":"clinic"}'

# 重設 Demo
curl.exe -X POST http://localhost:8080/api/reset
```

## PWA 安裝與離線

- 只有長輩端 `elder.html` 是 PWA；後台 `admin.html` 是一般網頁。
- `public/manifest.json` 的 `start_url` 是 `./elder.html`，`scope` 是 `./`。
- `public/sw.js` 會快取 App Shell（HTML、CSS、JS、圖示、manifest）。API 與 SSE 一律走網路，不快取。
- 前端會把最近一次狀態存在 `localStorage`。後端暫時無法連線時：
  - 先顯示上次資料與「目前離線」提示
  - 修改操作會排進離線佇列
  - 恢復連線後自動補送，再以伺服器狀態為準
- PWA 安裝與離線快取需要 **HTTPS** 或 **localhost**。用 `http://192.168.x.x:8080` 雖然可以瀏覽，但多數瀏覽器不允許在一般 HTTP 區網位址安裝 PWA／啟用 Service Worker。
- 更新前端後，若已安裝的 App 還看到舊版，請調高 `public/sw.js` 開頭的 `VERSION`，再重新整理或關閉重開 App。

### 手機安裝

Android（Chrome／Edge）：

- 開啟長輩端後，依畫面提示按「安裝到手機」
- 或從瀏覽器右上角選單選「安裝應用程式」

iPhone／iPad（Safari）：

- 點分享按鈕
- 選「加入主畫面」

## 設計與無障礙

- 保留原本的暖米色背景、高對比色塊與大按鈕
- 內文最小 22px；特大模式會再放大
- 主要按鈕至少 64px 高
- 所有功能都有大字標題、圖示與語音提示
- 使用 SVG 示範照片、Web Audio 音效、彩帶動畫與 `speechSynthesis` 語音朗讀
- 後台同樣使用大字與高對比設計，方便在示範時快速操作

## 舊版備份

`legacy/` 保留了原本的單檔版本（`index.html`、`manifest.json`、`sw.js`、`icons/`），僅供對照與備份。伺服器只會服務 `public/`，不會載入 `legacy/`。部署用的壓縮檔預設不包含這個資料夾，只包含實際運作所需的 `server.js`、`data/`、`public/` 與本說明。

## 常見問題

### 連接埠 8080 已被占用

先找出占用程式並停止，或改用其他連接埠：

```powershell
$env:PORT = 3000
node server.js
```

### 後台沒有即時更新

- 確認兩個頁面都連到同一個 `localhost:8080`
- 確認伺服器仍在執行
- SSE 被封鎖時，前端會在 3 秒內用輪詢補上
- 重新整理頁面可重新建立連線

### 重設後資料沒有變

- 確認按的是後台右上角的「重設 Demo」
- 重新整理頁面
- 若仍異常，停止伺服器、刪除 `data/db.json`，再啟動伺服器

### 要部署到正式環境

- 用 Node.js 執行 `server.js`，並讓反向代理（Nginx／Caddy 等）轉發到該連接埠
- 為 SSE 關閉代理緩衝（例如 Nginx 的 `proxy_buffering off`）
- 使用 HTTPS，PWA 安裝與離線功能才能正常運作
- 確保 `data/` 目錄可寫入
