# 群組呈現與序號開關開發紀錄

基準：analysis/a1-rule-equivalence，74af6dd1567a437b1aed28fa4d7f8f38a313d203。
本輪只寫入 feature/group-visuals-number-toggle；保留 A1／A2 成果。不修改 main、部署設定或 Android，不發布 APK。

## 群組視覺合併

棋盤 gap 改為 0。依既有 groups(board) 的連通分量，逐格計算上／右／下／左是否為外露邊：
只有外露邊才由不占布局空間的白色偽元素邊框繪製。
移除原本每格的 linked inset shadow，防止群組內仍有線條。
只有兩條相接邊皆外露的凸角保留圓角，其餘角為零；L 形及凹角不以矩形外框代替。

圖片仍使用原本拼圖座標定位，格子間沒有 CSS gap，偽元素也不會縮小背景繪製區域。
每次 render 重新計算外露邊。相同大小的棋盤重用格子與編號節點，
相同圖片不重設 backgroundImage，避免點選／拖曳落下時重建圖片造成閃爍。
只有棋盤大小改變時重建格子。指標事件處理方式未變。

注意：原始 v0.5 的群組強調色實為綠色 inset shadow，沒有白色群組邊框；
本輪按需求將外露輪廓統一為白色。沒有新增拖曳動畫或改動勝利判定。

## 序號開關

設定面板新增「顯示拼圖序號」勾選框，預設關閉，兩種模式都適用。
以 localStorage 的 puzzle-connect.show-numbers 儲存偏好。儲存被封鎖時仍可操作，
本次開啟有效，但無法跨重啟保存。開關只切換 CSS 類別，不 render／重設棋盤，也不計步。

index.html 的 ENABLE_NUMBER_DEBUG 單一設定改為 false，
即可同時停用開關與全部序號顯示，即使裝置先前存過開啟偏好也不例外。
隱藏序號後數字模式的拼圖沒有數字標籤，符合試玩隱藏需求；移動規則不受影響。

## 測試基準與規則保護

新增 analysis/stage-a/fixtures/v0.5.html，完整保留原始 HTML。
A1 oracle.mjs 的預設來源改為這份固定快照，原本完整 Git blob 雜湊檢查保留。
其餘 A1 模組、A1 測試、A2 程式與 A2 結果均不改動。

新增 scripts/check-render-logic.mjs，直接檢查目前 index.html 的 groups、
move（含勝利判定）及 pointerdown／move／up／cancel 程式片段
與快照逐位元組相同，避免新畫面修改使舊測試只驗證快照而漏掉規則變更。

## 驗證結果（2026-10-26）

共 36 項不同測試通過：A1 11、A2 8、呈現邏輯 6、Chrome 畫面／互動 11。
既有 scripts/check-web.mjs 的語法與必要元素檢查亦通過。
實際以已安裝的 headless Chrome 執行畫面測試，並檢視合併完成棋盤的截圖。

Chrome 驗證包含：
- 預設隱藏、勾選與取消、重新載入保留偏好、停用單一功能設定。
- 水平、垂直、L 形、單格與完整群組的外露邊。
- 群組內 CSS gap = 0、相鄰格幾何接合、中央格無圓角或占空間的 border。
- 真正點選操作令群組重新形成、真正 mouse pointer drag 令群組越界拆分。
- 拖曳後保留相同 DOM 格子、背景定位連續、4×4／6×6 大小更新。
- 沒有瀏覽器腳本錯誤。

執行命令（Node.js 22+，於 repository 根目錄）：

~~~sh
node scripts/check-web.mjs
node scripts/check-render-logic.mjs
node analysis/stage-a/model.test.mjs
node analysis/stage-a/reversibility.test.mjs
~~~

瀏覽器驗證另需已安裝 Playwright 與其 Chromium；不為遊戲增加依賴：

~~~sh
node scripts/check-visuals.mjs
~~~

若 Playwright 或 Chrome 不在預設位置，可用 PLAYWRIGHT_MODULE 指定其套件絕對路徑，
CHROME_PATH 指定已安裝 Chrome 執行檔。本次由 Codex Node runtime 載入 Playwright，
傳入 headless Chrome browser 到同一個 runBrowserTests(browser, html) 執行。
測試用棋盤設定介面只在測試記憶體文件注入，不存在於遊戲 HTML。

## A2 完整重跑

本輪重新建立全部轉移表並通過獨立線性掃描驗證，結果與既有 a2-results.json 完全相同：
362,880 狀態；26,127,360 次合法計步操作；14,383,754 條去重有向邊；
543,026 條邊沒有合法一步返回（含重複動作則為 1,092,168 次）。
反例、定義及 A3 建議見 [A2 報告](../analysis/stage-a/A2.md)。
A3 應使用轉置有向圖上的反向 BFS；本輪未執行 BFS、可達性或最短步數搜尋。

## 待人工驗證

Android／iOS 實機觸控、各手機瀏覽器的子像素圖片接縫、快速連續拖曳下的長時間閃爍，
以及真實照片選取後的視覺效果仍需實機確認。這輪沒有打包或發布 APK。
