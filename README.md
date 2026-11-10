# 群組活動佈告欄 / 揪團平台 │ 可直接部署至 Vercel

一個嵌進 LINE 群組使用的活動揪團網頁（LIFF）。前端純靜態頁面，
後端用 Vercel Serverless Functions，資料可存 Upstash Redis。

【重點】不填任何設定就能先部署跳起來（試跑模式），之後再補上 LIFF_ID 與資料庫。

---

## 一、五分鐘先把它部署上線

### 方式 A：網頁上傳（最簡單）
1. 到 [vercel.com](https://vercel.com) 用 GitHub / Email 註冊登入。
2. 把整個資料夾丟上 GitHub（或直接用 Vercel CLI，見方式 B）。
3. Vercel → **Add New → Project** → 選你的 repo → **Deploy**。
   - Framework Preset 選 **Other**（本專案無需 build）。
4. 部署完會得到網址，例如 `https://line-group-events.vercel.app`。

### 方式 B：Vercel CLI
```bash
npm i -g vercel
cd line-group-events
vercel          # 依提示登入、建專案
 vercel --prod  # 正式部署
```

打開網址就能看到活動佈告欄。此時是**試跑模式**（輸入名稱登入），報名 / 留言都能用。

---

## 二、接上真正的 LINE 登入（LIFF）

1. 到 [LINE Developers Console](https://developers.line.biz/) 登入。
2. 建一個 **Provider**。
3. **Create a new channel → LINE Login**，記下 **Channel ID**。
4. 進該 channel → **LIFF** 分頁 → **Add**：
   - Endpoint URL：你 Vercel 的網址（例 `https://line-group-events.vercel.app`）
   - Size：**Full**
   - Scope：勾 `profile`、`openid`
5. 得到 **LIFF ID**（像 `1234567890-abcdEfgh`）與 `https://liff.line.me/<LIFF_ID>` 連結。
6. 編輯 `public/config.js`，把 `LIFF_ID` 填進去，重新部署。
7. 到 Vercel 專案 → **Settings → Environment Variables** 加上：
   - `LINE_LOGIN_CHANNEL_ID` = 步驟 3 的 Channel ID

填了 `LIFF_ID` 之後，網頁會自動改用 LINE 登入 + 後端 API。

---

## 三、讓資料永久保存（Upstash Redis，強烈建議）

不設時資料存在記憶體，冷啟動 / 重新部署會清空。要永久保存：
1. 到 [upstash.com](https://upstash.com) 建一個免費 **Redis** 資料庫。
2. 複製 **REST URL** 與 **REST TOKEN**。
3. Vercel → Settings → Environment Variables 加上：
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. 重新部署。

> 也可在 Vercel 的 **Storage** 分頁一鍵建立 Upstash，會自動幫你填好這兩個變數。

---

## 四、把它導入 LINE 群組

- **最簡單**：把 `https://liff.line.me/<LIFF_ID>` 貼進群組，成員一點就在 LINE 內開啟。
- **進階**：再建一個 Messaging API channel（機器人）加進群組，用圖文選單（Rich Menu）
  按鈕開啟該 LIFF 網址；或在新活動時用 push message 發 Flex 卡片到群組。

---

## 五、專案結構
```
line-group-events/
├─ public/            前端静態頁面
│  ├─ index.html
│  ├─ style.css
│  ├─ config.js       ★ 填 LIFF_ID 的地方
│  └─ app.js
├─ api/               Vercel Serverless Functions
│  ├─ events.js       GET 活動列表 / POST 新增活動
│  ├─ signup.js       POST 報名 / 取消
│  ├─ comments.js     POST 留言
│  ├─ _store.js       儲存層（Upstash / 記憶體）
│  ├─ _auth.js        驗證 LINE idToken
│  └─ seed.js         預設種子資料
├─ vercel.json
├─ package.json
├─ .env.example
└─ .gitignore
```

## 六、本機開發
```bash
npm i -g vercel
vercel dev        # 會同時跑 public 與 api，網址 http://localhost:3000
```

## 七、常見問題
- **按登入沒反應 / 跳試跑模式**：`config.js` 的 `LIFF_ID` 還是空的。
- **報名後資料消失**：沒設 Upstash，請依第三段設定。
- **401 請先登入**：環境變數 `LINE_LOGIN_CHANNEL_ID` 未設或與 LIFF 不同 channel。
- **改活動內容**：編輯 `api/seed.js`（首次寫入）；已有資料庫時可改用 POST /api/events 新增。
