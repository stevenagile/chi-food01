import { Download } from 'lucide-react';
import { useRef } from 'react';
import AdminNav from '@/components/AdminNav';

const ManualPage = () => {
  const manualRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!manualRef.current) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    const manualContent = manualRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><meta charset="UTF-8"><title>虎秋文昌雞 · 系統操作手冊 v4.0</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: 'Microsoft JhengHei','PingFang TC',sans-serif; margin:0; padding:0; background:white; color:#1a1a1a; font-size:13px; line-height:1.7; }
        .manual-content { max-width:720px; margin:0 auto; padding:40px 30px; }
        h1 { font-size:24px; text-align:center; margin:0 0 8px; color:#8B4513; }
        h2 { font-size:18px; color:#8B4513; border-bottom:2px solid #C4A265; padding-bottom:6px; margin-top:30px; }
        h3 { font-size:15px; color:#333; margin-top:16px; }
        h4 { font-size:14px; color:#333; margin-top:12px; margin-bottom:6px; }
        p { margin:6px 0; } ul,ol { padding-left:20px; } li { margin:4px 0; }
        strong { color:#8B4513; }
        code { background:#f5f5f5; padding:1px 6px; border-radius:3px; font-size:12px; }
        .tip-box { background:#FFF8E1; border-left:4px solid #C4A265; padding:10px 14px; border-radius:0 8px 8px 0; margin:10px 0; font-size:12px; }
        .warn-box { background:#FFF3E0; border-left:4px solid #E65100; padding:10px 14px; border-radius:0 8px 8px 0; margin:10px 0; font-size:12px; }
        .ok-box { background:#E8F5E9; border-left:4px solid #4CAF50; padding:10px 14px; border-radius:0 8px 8px 0; margin:10px 0; font-size:12px; }
        table { width:100%; border-collapse:collapse; margin:10px 0; font-size:12px; }
        th,td { border:1px solid #ddd; padding:6px 10px; text-align:left; }
        th { background:#F5F0E8; color:#8B4513; font-weight:bold; }
        @media print { body { margin:0; font-size:11px; } .manual-content { padding:20px; } section { page-break-inside:avoid; } h2 { page-break-after:avoid; } }
        @page { margin:15mm 12mm; }
      </style></head><body>
        <div class="manual-content">
          <h1>🐯 虎秋文昌雞</h1>
          <p style="text-align:center;color:#666;margin-bottom:30px;">系統操作手冊 v4.0 · ${new Date().toLocaleDateString('zh-TW')}</p>
          ${manualContent}
          <p style="text-align:center;color:#999;margin-top:40px;font-size:11px;">虎秋文昌雞 · 系統操作手冊 v4.0 · 機密文件</p>
        </div>
        <script>window.onload=()=>{setTimeout(()=>window.print(),500);}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const StepItem = ({ num, children }: { num: number; children: React.ReactNode }) => (
    <div className="flex items-start gap-3">
      <span className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 text-sm">{num}</span>
      <div className="text-foreground text-sm flex-1">{children}</div>
    </div>
  );

  const TipBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-accent/10 border border-accent rounded-xl p-4">
      <p className="text-sm text-foreground">💡 <strong>提示：</strong>{children}</p>
    </div>
  );

  const WarnBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
      <p className="text-sm text-foreground">⚠️ <strong>注意：</strong>{children}</p>
    </div>
  );

  const OkBox = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-green-50 border border-green-300 rounded-xl p-4">
      <p className="text-sm text-foreground">✅ {children}</p>
    </div>
  );

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section id={id} className="space-y-4">
      <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">{title}</h2>
      <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">{children}</div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-dark-wood text-dark-wood-foreground px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">📖 手冊</h1>
              <p className="text-xs text-gold/60">v4.0 · 虎秋文昌雞</p>
            </div>
            <AdminNav />
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/20 hover:bg-gold/30 text-gold transition-colors"
            title="下載 PDF"
          >
            <Download size={18} />
            <span className="hidden sm:inline text-sm font-medium">下載 PDF</span>
          </button>
        </div>
      </div>

      <div ref={manualRef} className="max-w-4xl mx-auto p-6 space-y-10">

        {/* 目錄 */}
        <section className="bg-card rounded-2xl border border-border p-6 shadow-warm">
          <h2 className="font-serif-tc font-bold text-xl text-foreground mb-4">📋 目錄</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <nav className="space-y-1.5 text-primary">
              <a href="#overview" className="block hover:underline text-sm">1. 系統總覽與 iPad 分工</a>
              <a href="#devices" className="block hover:underline text-sm">2. 兩臺 iPad 怎麼擺、怎麼登入</a>
              <a href="#pos" className="block hover:underline text-sm">3. POS：點餐 + 收款</a>
              <a href="#customer" className="block hover:underline text-sm">4. 客人手機自助點餐</a>
              <a href="#kds" className="block hover:underline text-sm">5. KDS：出餐操作</a>
            </nav>
            <nav className="space-y-1.5 text-primary">
              <a href="#inventory" className="block hover:underline text-sm">6. 庫存管理</a>
              <a href="#accounting" className="block hover:underline text-sm">7. 帳務（供應商付款）</a>
              <a href="#reports" className="block hover:underline text-sm">8. 報表與每日歸零</a>
              <a href="#qr" className="block hover:underline text-sm">9. 桌號 QR Code</a>
              <a href="#faq" className="block hover:underline text-sm">10. 常見問題</a>
            </nav>
          </div>
        </section>

        {/* 1. Overview */}
        <Section id="overview" title="1. 系統總覽與 iPad 分工">
          <p className="text-foreground leading-relaxed">
            本系統為虎秋文昌雞數位點餐與營運平台，店面採用<strong>兩臺 iPad 分工</strong>運作：
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border px-3 py-2 text-left text-foreground">裝置</th>
                  <th className="border border-border px-3 py-2 text-left text-foreground">操作者</th>
                  <th className="border border-border px-3 py-2 text-left text-foreground">主頁面</th>
                  <th className="border border-border px-3 py-2 text-left text-foreground">職責</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border px-3 py-2 text-foreground font-medium">POS iPad</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">櫃檯人員</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground"><code>/admin/pos</code></td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">幫客人點餐、現場收款結帳</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2 text-foreground font-medium">KDS iPad</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">廚房人員</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground"><code>/admin/kds</code></td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">看單、按「進製作」「出餐完成」</td>
                </tr>
                <tr>
                  <td className="border border-border px-3 py-2 text-foreground font-medium">客人手機</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">客人</td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">掃 QR → <code>/menu</code></td>
                  <td className="border border-border px-3 py-2 text-muted-foreground">自助點餐、查看訂單狀態</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-bold text-foreground">訂單在系統內的流轉</h4>
          <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
            <li><strong>建單</strong>：POS 開單 或 客人手機送單 → 狀態 <code>待確認</code></li>
            <li><strong>收款</strong>：POS 收現金/掃碼 → <code>已付款</code>（客人自助單由 POS 之後補收）</li>
            <li><strong>製作</strong>：KDS 按「開始製作」→ <code>製作中</code></li>
            <li><strong>出餐</strong>：KDS 按「出餐完成」→ <code>已完成</code>，自動扣減庫存</li>
            <li><strong>歸零</strong>：當日結束 → 報表頁手動歸零 或 凌晨 4:00 自動歸零</li>
          </ol>

          <TipBox>POS 與 KDS 任何一臺操作，另一臺會即時同步更新，不需要手動重新整理。</TipBox>
        </Section>

        {/* 2. Devices */}
        <Section id="devices" title="2. 兩臺 iPad 怎麼擺、怎麼登入">
          <h4 className="font-bold text-foreground">擺放建議</h4>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
            <li><strong>POS iPad</strong>：櫃檯結帳處，面向人員，方便點餐、找零、收款。</li>
            <li><strong>KDS iPad</strong>：廚房內側牆面或料理檯上方，畫面大字體，便於遠距閱讀。</li>
          </ul>

          <h4 className="font-bold text-foreground">兩臺 iPad 共同的登入步驟</h4>
          <div className="space-y-3">
            <StepItem num={1}>
              <p className="font-medium">開啟 Safari，輸入後台網址</p>
              <p className="text-muted-foreground">前往 <code>/admin/login</code>，或從首頁點底部「⚙️ 後台管理」</p>
            </StepItem>
            <StepItem num={2}>
              <p className="font-medium">輸入帳號密碼登入</p>
              <p className="text-muted-foreground">使用管理員 Email 與密碼登入。系統登入後預設跳到 POS 頁。</p>
            </StepItem>
            <StepItem num={3}>
              <p className="font-medium">切換到對應頁面</p>
              <p className="text-muted-foreground">
                POS iPad 停在 <code>/admin/pos</code>；KDS iPad 點頂部「🍳 出餐」分頁，停在 <code>/admin/kds</code>。
              </p>
            </StepItem>
            <StepItem num={4}>
              <p className="font-medium">加入主畫面（建議）</p>
              <p className="text-muted-foreground">Safari → 分享 → 加入主畫面，下次一鍵開啟。</p>
            </StepItem>
          </div>

          <TipBox>兩臺 iPad 可以共用同一組管理員帳號，也可以各自註冊不同帳號（推薦：方便後續分辨操作者）。</TipBox>
        </Section>

        {/* 3. POS */}
        <Section id="pos" title="3. POS：點餐 + 收款">
          <div className="rounded-2xl border border-border overflow-hidden">
            <img src="/manual/screenshot-menu.jpg" alt="POS 點餐畫面" className="w-full" />
          </div>

          <h4 className="font-bold text-foreground">內用點餐流程</h4>
          <div className="space-y-3">
            <StepItem num={1}><p><strong>選桌號</strong>：左側選擇桌 1~10。已有未結單會顯示金額提示。</p></StepItem>
            <StepItem num={2}><p><strong>選品項</strong>：上方切換分類（切盤／飯類／小菜／飲品／假日限定），點品項加入購物車。需要選部位/份量者會跳出選項視窗。</p></StepItem>
            <StepItem num={3}><p><strong>確認購物車</strong>：右側檢視品項、數量、金額；可調整數量或刪除。</p></StepItem>
            <StepItem num={4}><p><strong>送出訂單</strong>：按「送出訂單」。訂單立刻出現在 KDS。</p></StepItem>
            <StepItem num={5}>
              <p><strong>收款結帳</strong>：點該桌訂單 → 選「現金」或「掃碼支付」→ 確認金額 → 完成。</p>
            </StepItem>
          </div>

          <h4 className="font-bold text-foreground">外帶點餐</h4>
          <p className="text-sm text-muted-foreground">頂部切換成「外帶」即可（不需要選桌號），其餘流程與內用相同。</p>

          <h4 className="font-bold text-foreground">修改訂單</h4>
          <p className="text-sm text-muted-foreground">點任一訂單卡片 → 「修改品項」可加減品項或數量，金額自動重算。</p>

          <h4 className="font-bold text-foreground">列印收據</h4>
          <p className="text-sm text-muted-foreground">收款完成後可在訂單卡片按「列印收據」，支援熱感應印表機。</p>

          <OkBox><strong>關鍵原則</strong>：點餐與收款是兩個獨立動作。先送單給廚房製作，客人離桌前再回 POS 收款；現場點餐通常一次完成。</OkBox>
        </Section>

        {/* 4. Customer */}
        <Section id="customer" title="4. 客人手機自助點餐">
          <div className="rounded-2xl border border-border overflow-hidden">
            <img src="/manual/screenshot-qr.jpg" alt="客人 QR Code 點餐" className="w-full" />
          </div>

          <h4 className="font-bold text-foreground">客人端流程</h4>
          <div className="space-y-3">
            <StepItem num={1}><p>客人掃桌上 QR Code，自動帶入桌號進入菜單頁。</p></StepItem>
            <StepItem num={2}><p>選品項加入購物車 → 送出訂單。</p></StepItem>
            <StepItem num={3}><p>畫面顯示訂單編號與目前狀態（待確認 / 製作中 / 已完成），可隨時重新整理查看進度。</p></StepItem>
          </div>

          <h4 className="font-bold text-foreground">店內如何處理客人送來的單</h4>
          <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
            <li>訂單會以「未付款」狀態出現在 POS 該桌號下，同時也出現在 KDS 待製作清單。</li>
            <li>KDS 可立即按「開始製作」，無需等待付款。</li>
            <li>客人離桌結帳時，POS 人員打開該桌訂單，選付款方式收款即可。</li>
          </ol>

          <WarnBox>客人自助送單時，系統會即時檢查庫存。若食材不足，客人會收到「無法接單」提示，避免接到做不出來的單。</WarnBox>
        </Section>

        {/* 5. KDS */}
        <Section id="kds" title="5. KDS：出餐操作">
          <p className="text-foreground">KDS 是廚房專用畫面，把訂單依狀態分成三欄，從左到右就是製作順序：</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-background rounded-xl p-3 border border-border">
              <h4 className="font-bold text-foreground text-sm mb-1">📋 待製作</h4>
              <p className="text-xs text-muted-foreground">新進來的訂單。按「開始製作」進入下一欄。</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border">
              <h4 className="font-bold text-foreground text-sm mb-1">🔥 製作中</h4>
              <p className="text-xs text-muted-foreground">正在做的訂單，顯示已製作時間。完成後按「出餐完成」。</p>
            </div>
            <div className="bg-background rounded-xl p-3 border border-border">
              <h4 className="font-bold text-foreground text-sm mb-1">✅ 已完成</h4>
              <p className="text-xs text-muted-foreground">當日已出餐紀錄，方便回查。</p>
            </div>
          </div>

          <h4 className="font-bold text-foreground">KDS 操作建議</h4>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
            <li>看到「待製作」立刻按「開始製作」，讓 POS 端與客人手機都能看到狀態更新。</li>
            <li>菜備好上桌或交給外帶客人後，再按「出餐完成」，此時系統才會扣庫存。</li>
            <li>若做錯或客人取消，點訂單可改成「已取消」，已扣的庫存會自動還原。</li>
          </ul>

          <TipBox>KDS 不負責收款。收款一律由 POS iPad 進行，避免兩臺重複操作或漏帳。</TipBox>
        </Section>

        {/* 6. Inventory */}
        <Section id="inventory" title="6. 庫存管理">
          <h4 className="font-bold text-foreground">頁面結構</h4>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
            <li><strong>食材清單</strong>：每項食材的目前庫存、最低庫存警示、單位、單位成本。</li>
            <li><strong>進貨</strong>：記錄向供應商買入的食材，自動加到庫存。</li>
            <li><strong>領用</strong>：記錄非賣出的耗用（例如試菜、報廢），會扣庫存。</li>
            <li><strong>菜單對應</strong>：每樣菜要用多少食材（配方），讓系統知道賣一份扣多少。</li>
          </ul>

          <h4 className="font-bold text-foreground">自動扣庫存的時機</h4>
          <p className="text-sm text-muted-foreground">
            只有訂單狀態變成「已完成」時才扣庫存；訂單變「已取消」會自動還原。這代表 KDS 按「出餐完成」就是真正消耗食材的瞬間。
          </p>

          <WarnBox>進貨後務必記得在「進貨」頁登記，否則庫存不會增加，未來會誤判缺料。</WarnBox>
        </Section>

        {/* 7. Accounting */}
        <Section id="accounting" title="7. 帳務（供應商付款）">
          <p className="text-foreground">帳務頁專門管理「我們欠供應商多少錢」：</p>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
            <li>每筆進貨會自動產生一筆應付款。</li>
            <li>實際付款後到帳務頁標記「已結清」，並可填付款方式與備註。</li>
            <li>頁面上方顯示未結清總額，避免漏付。</li>
          </ul>
          <TipBox>建議每週固定一天結算供應商款項，配合報表頁的營收一起檢視現金流。</TipBox>
        </Section>

        {/* 8. Reports */}
        <Section id="reports" title="8. 報表與每日歸零">
          <h4 className="font-bold text-foreground">報表頁能看到</h4>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
            <li>今日營收、訂單數、客單價</li>
            <li>近 7 日 / 30 日營收趨勢</li>
            <li>銷售排行（哪些品項賣最好）</li>
            <li>內用 vs 外帶比例、付款方式統計</li>
          </ul>

          <h4 className="font-bold text-foreground">每日歸零（兩種方式並存）</h4>
          <div className="space-y-3">
            <StepItem num={1}>
              <p className="font-medium">手動歸零（建議每日打烊前執行）</p>
              <p className="text-muted-foreground">
                報表頁右上角紅色「結算今日並歸零」→ 二次確認 → 系統把當日營收寫入歷史紀錄，並把所有訂單封存。
              </p>
            </StepItem>
            <StepItem num={2}>
              <p className="font-medium">自動歸零（保險機制）</p>
              <p className="text-muted-foreground">
                每天台北時間<strong>凌晨 4:00</strong>，系統會自動執行一次歸零，避免忘記手動結帳導致跨日數據混在一起。
              </p>
            </StepItem>
          </div>

          <WarnBox>歸零是不可復原的動作。執行後當日訂單會被封存，POS 與 KDS 畫面會清空，準備迎接新的一天。</WarnBox>
        </Section>

        {/* 9. QR */}
        <Section id="qr" title="9. 桌號 QR Code">
          <div className="rounded-2xl border border-border overflow-hidden">
            <img src="/manual/screenshot-qr.jpg" alt="桌號 QR Code 頁面" className="w-full" />
          </div>
          <p className="text-sm text-foreground">QR Code 頁面自動為桌 1~10 產生 QR Code，可：</p>
          <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
            <li>線上預覽、下載 PNG</li>
            <li>一次列印整頁，剪下護貝後貼桌</li>
            <li>客人掃碼即直接進入該桌號的點餐頁</li>
          </ul>
          <TipBox>QR Code 不會過期。除非更換網域，否則一次製作即可長期使用。</TipBox>
        </Section>

        {/* 10. FAQ */}
        <Section id="faq" title="10. 常見問題">
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-foreground">Q1. 客人手機送單後，POS 看不到？</h4>
              <p className="text-sm text-muted-foreground">先確認 POS 切到正確桌號；若仍看不到，下拉重新整理或檢查網路。</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground">Q2. 庫存數字不對怎麼辦？</h4>
              <p className="text-sm text-muted-foreground">到庫存頁直接編輯該食材「目前庫存」即可手動修正；建議同時填一筆「領用」或「進貨」紀錄留軌跡。</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground">Q3. KDS 不小心按錯「出餐完成」？</h4>
              <p className="text-sm text-muted-foreground">到「已完成」欄找到該單，狀態可改回「製作中」；庫存已扣的部分系統不會重複扣。</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground">Q4. 忘記手動歸零，跨日了？</h4>
              <p className="text-sm text-muted-foreground">不用擔心，凌晨 4:00 系統會自動歸零，當日資料仍會正確切分到對應日期。</p>
            </div>
            <div>
              <h4 className="font-bold text-foreground">Q5. 兩臺 iPad 哪臺都能收款嗎？</h4>
              <p className="text-sm text-muted-foreground">技術上可以，但建議<strong>只在 POS iPad 收款</strong>，避免雙人同時操作造成重複收款。</p>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
};

export default ManualPage;
