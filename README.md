# 拼圖連連 v0.5

[直接玩網頁版](https://SacredCatToucher.github.io/puzzle-connect-game/) · [下載 Android 測試版](https://github.com/SacredCatToucher/puzzle-connect-game/actions/workflows/android-debug.yml)

保留 v0.5 的單塊交換、獨立相鄰群組連結與移動、邊界拆開回填、3–6 階及自選圖片。根目錄 `index.html` 是網站與 Android 共用的唯一遊戲來源。本次 Android 包裝未修改遊戲內容；原檔頁首仍顯示 v0.2，但 HTML title 為 v0.5，這是既有版本標示差異。

## 一步步下載 APK（不需要電腦開發工具）

1. 在 Android 手機瀏覽器登入 GitHub，開啟上方「下載 Android 測試版」。GitHub 的 Actions artifact 下載需要登入。
2. 選擇最新一筆 **Android debug APK**、分支為 **main** 且有綠色勾勾的執行紀錄。請避開 PR 測試版本。
3. 向下捲到 **Artifacts**，點選 `puzzle-connect-v0.5-debug-數字`，下載 ZIP。手機畫面找不到時，可在瀏覽器選單啟用「電腦版網站」。
4. 用手機的「檔案／Files」找到下載的 ZIP 並解壓縮。裡面有 `puzzle-connect-v0.5-debug.apk`、`SHA256SUMS.txt`、`build-info.txt` 和 APK 資訊；要安裝的是 `.apk`。
5. Artifact 保留 **30 天**。若下載已過期，可在 Actions 頁按 **Run workflow → main → Run workflow**，等待新的綠色勾勾再下載；此操作需要 repo 寫入權限。

## 一步步安裝與測試

1. 確認手機為 **Android 7.0 或以上**，並更新 Chrome／Android System WebView。
2. 點開解壓縮後的 APK。若系統提示禁止從此來源安裝，按「設定」，只對目前開啟 APK 的瀏覽器或檔案管理員開啟「允許安裝未知應用程式」，返回後按「安裝」。各廠牌名稱可能不同。
3. 安裝完成按「開啟」，或從桌面點「拼圖連連」。安裝後可離線遊玩，不必開啟網站。
4. 請實機確認：拖曳與依序點選交換、兩個獨立群組分開移動、群組越界回填、3×3 至 6×6、新關卡、顯示答案、上傳手機圖片及切回數字模式；也確認直向／橫向時操作按鈕沒有被系統列遮住。
5. 測完可關閉剛才的「允許安裝未知應用程式」。如遇安裝政策阻擋，保留系統保護並回報提示文字，不必關閉 Play Protect。

這是 **debug 側載測試版**，不是 Google Play 上架版。CI 使用 Android 預設 debug 簽章，不需要你提供金鑰或 Secrets。每次乾淨的 CI 建置可能產生不同測試簽章；若新版顯示「套件衝突／無法更新」，先移除舊測試版再安裝（移除會清掉 App 本機資料）。`build-info.txt` 可對照來源 commit；`SHA256SUMS.txt` 是 APK 校驗碼。

## 建置與更新方式

平常只需要在 GitHub 修改 `index.html` 並推送到 main。原有 **Validate web prototype** 和 GitHub Pages 部署維持原狀；獨立的 **Android debug APK** workflow 會另外產生 APK。README 單獨更新不觸發 APK 建置，可手動 Run workflow。

CI 步驟為：`npm ci` → 網頁語法檢查 → 複製遊戲 → Capacitor sync → Gradle assembleDebug → APK 簽章檢查 → 比對 APK 內的 HTML 與原檔 → 上傳 artifact。Android 編譯在 GitHub ubuntu-24.04 runner 完成，本機不必安裝 Android Studio、SDK、Java 或模擬器。

### 輕量本機檢查（選用）

使用 `.nvmrc` 指定的 Node.js 24.17.0：

```sh
npm ci --ignore-scripts --no-fund --no-audit
npm run check
npm run android:sync
```

`www/` 和 Android 的網頁 assets 是產生檔，不要直接編輯或提交。`android/` 原生專案和 Gradle wrapper 已提交，可繼續加功能；不需每次重新執行 `cap add android`。

### 本機編譯 APK（選用，較耗資源）

需 JDK 21、Android SDK platform 36 和 build-tools 35.0.0。先執行上面的安裝與同步步驟，再執行：

```sh
cd android
# macOS / Linux
bash gradlew --no-daemon assembleDebug
# Windows PowerShell
.\gradlew.bat --no-daemon assembleDebug
```

結果為 `android/app/build/outputs/apk/debug/app-debug.apk`。SDK 路徑可用 `ANDROID_HOME` 或未提交的 `android/local.properties` 指定。

### 依賴固定與可重現性

- Capacitor core／android／cli 全部固定為 8.5.3；`package-lock.json` 鎖住 npm 間接依賴與完整性雜湊，CI 使用 `npm ci`，不要刪除 lockfile。
- 固定 Node 24.17.0、Temurin JDK 21.0.8+9、Android platform 36／build-tools 35.0.0、AGP 8.13.0、Gradle 8.14.3；Gradle 下載另以 SHA-256 驗證。AndroidX 等版本在 `android/variables.gradle` 指定。
- 新 workflow 的 Actions 以 commit SHA 固定。SDK patch、runner 系統映像與 Maven 間接依賴仍受上游供應影響；這是可重跑的固定版本建置流程，不宣稱 APK 每次逐位元相同（debug 簽章也會不同）。
- 升級依賴請另做變更、更新 lockfile，並確認 APK 與網站檢查都成功。不要把本機 SDK、node_modules、簽章金鑰或編譯產物提交到 repo。

## 常見問題

- **Actions 紅叉**：開啟該執行紀錄的 build job，查看第一個失敗步驟。重新執行同一 commit 可排除暫時性下載失敗；不要為了修 Android 改掉 Pages 設定。
- **沒有 Artifacts**：確認選到 Android workflow、工作已全部成功且未過期。網頁驗證與 Pages 的紀錄不會提供 APK。
- **手機不允許安裝**：確認已解壓縮並開啟 `.apk`，以及允許正確來源；公司管理的手機可能禁止側載。
- **圖片選擇或觸控有問題**：請回報 Android 版本、WebView 版本、手機型號、`build-info.txt` 的 commit 與重現步驟。CI 驗證建置、簽章及內含網頁，實際手機操作仍需人工測試。
