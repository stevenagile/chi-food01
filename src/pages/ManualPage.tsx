import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import AdminNav from '@/components/AdminNav';

const ManualPage = () => {
  const navigate = useNavigate();
  const manualRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!manualRef.current) return;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    
    const manualContent = manualRef.current.innerHTML;
    
    const images = manualRef.current.querySelectorAll('img');
    const imagePromises = Array.from(images).map(async (img) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imageElement = new Image();
        imageElement.crossOrigin = 'anonymous';
        
        return new Promise<string>((resolve) => {
          imageElement.onload = () => {
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;
            ctx?.drawImage(imageElement, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          imageElement.onerror = () => resolve(img.src);
          imageElement.src = img.src;
        });
      } catch (error) {
        return img.src;
      }
    });
    
    const base64Images = await Promise.all(imagePromises);
    let processedContent = manualContent;
    
    images.forEach((img, index) => {
      processedContent = processedContent.replace(img.src, base64Images[index]);
    });
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>虎秋文昌雞 · 系統操作手冊 v3.0</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; 
              margin: 0; padding: 0; background: white; color: #1a1a1a;
              font-size: 13px; line-height: 1.7;
            }
            .manual-content { max-width: 700px; margin: 0 auto; padding: 40px 30px; }
            img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e0e0e0; }
            h1 { font-size: 24px; text-align: center; margin: 0 0 8px; color: #8B4513; }
            h2 { font-size: 18px; color: #8B4513; border-bottom: 2px solid #C4A265; padding-bottom: 6px; margin-top: 30px; }
            h3 { font-size: 15px; color: #333; margin-top: 16px; }
            h4 { font-size: 14px; color: #333; margin-top: 12px; margin-bottom: 6px; }
            p { margin: 6px 0; }
            ul, ol { padding-left: 20px; }
            li { margin: 4px 0; }
            strong { color: #8B4513; }
            code { background: #f5f5f5; padding: 1px 6px; border-radius: 3px; font-size: 12px; }
            .toc a { display: block; padding: 3px 0; color: #8B4513; text-decoration: none; }
            .tip-box { background: #FFF8E1; border-left: 4px solid #C4A265; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 10px 0; font-size: 12px; }
            .warn-box { background: #FFF3E0; border-left: 4px solid #E65100; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 10px 0; font-size: 12px; }
            .ok-box { background: #E8F5E9; border-left: 4px solid #4CAF50; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 10px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
            th { background: #F5F0E8; color: #8B4513; font-weight: bold; }
            @media print {
              body { margin: 0; font-size: 11px; }
              .manual-content { padding: 20px; }
              section { page-break-inside: avoid; }
              h2 { page-break-after: avoid; }
              img { max-height: 300px; object-fit: contain; }
              .page-break { page-break-before: always; }
            }
            @page { margin: 15mm 12mm; }
          </style>
        </head>
        <body>
          <div class="manual-content">
            <h1>🐯 虎秋文昌雞</h1>
            <p style="text-align:center; color:#666; margin-bottom: 30px;">系統操作手冊 v3.0 · ${new Date().toLocaleDateString('zh-TW')}</p>
            ${processedContent}
            <p style="text-align:center; color:#999; margin-top:40px; font-size:11px;">虎秋文昌雞 · 系統操作手冊 v3.0 · 機密文件</p>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); }, 500); }<\/script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  const StepItem = ({ num, children, color = 'bg-primary text-primary-foreground' }: { num: number; children: React.ReactNode; color?: string }) => (
    <div className="flex items-start gap-3">
      <span className={`${color} w-7 h-7 rounded-full flex items-center justify-center font-bold shrink-0 text-sm`}>{num}</span>
      <div className="text-foreground text-sm">{children}</div>
    </div>
  );

  const TipBox = ({ icon = '💡', title = '提示', children }: { icon?: string; title?: string; children: React.ReactNode }) => (
    <div className="bg-accent/10 border border-accent rounded-xl p-4">
      <p className="text-sm text-foreground">{icon} <strong>{title}：</strong>{children}</p>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">📖 手冊</h1>
              <p className="text-xs text-gold/60">v3.0 · 虎秋文昌雞</p>
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

        {/* Table of Contents */}
        <section className="bg-card rounded-2xl border border-border p-6 shadow-warm">
          <h2 className="font-serif-tc font-bold text-xl text-foreground mb-4">📋 目錄</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <nav className="space-y-1.5 text-primary">
              <a href="#overview" className="block hover:underline text-sm">1. 系統總覽</a>
              <a href="#login" className="block hover:underline text-sm">2. 登入後台</a>
              <a href="#tables" className="block hover:underline text-sm">3. 桌況管理</a>
              <a href="#table-detail" className="block hover:underline text-sm">4. 桌位詳情操作</a>
              <a href="#orders" className="block hover:underline text-sm">5. 訂單追蹤（看板視圖）</a>
              <a href="#edit-order" className="block hover:underline text-sm">6. 修改訂單</a>
              <a href="#checkout" className="block hover:underline text-sm">7. 結帳流程</a>
            </nav>
            <nav className="space-y-1.5 text-primary">
              <a href="#receipt" className="block hover:underline text-sm">8. 列印收據</a>
              <a href="#reports" className="block hover:underline text-sm">9. 營收報表</a>
              <a href="#qr-codes" className="block hover:underline text-sm">10. 桌號 QR Code</a>
              <a href="#customer-order" className="block hover:underline text-sm">11. 客人點餐流程</a>
              <a href="#order-status" className="block hover:underline text-sm">12. 客人訂單狀態查詢</a>
              <a href="#reset" className="block hover:underline text-sm">13. 每日歸零</a>
              <a href="#faq" className="block hover:underline text-sm">14. 常見問題</a>
            </nav>
          </div>
        </section>

        {/* 1. Overview */}
        <section id="overview" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            1. 系統總覽
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm">
            <p className="text-foreground leading-relaxed mb-4">
              本系統為虎秋文昌雞餐廳專用的數位點餐與營運管理平台。客人透過手機掃描桌上 QR Code 自助點餐，
              訂單即時傳送至後台 iPad，工作人員可在平板上完成接單、出餐、結帳、報表等所有操作。
            </p>

            <h4 className="font-bold text-foreground mb-3">系統架構：</h4>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left text-foreground">端</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">使用者</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">裝置</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">功能</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">前台</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">客人</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">手機</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">掃碼點餐、查看訂單狀態</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">後台</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">店員/老闆</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">iPad / 電腦</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">桌況管理、訂單處理、結帳、報表</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-bold text-foreground mb-3">核心功能模組：</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: '🏠', title: '首頁入口', desc: '品牌形象頁，引導客人開始點餐' },
                { icon: '👥', title: '桌況管理', desc: '10 宮格即時呈現桌位狀態、計時、金額' },
                { icon: '🕐', title: '訂單追蹤', desc: '待確認→製作中→已完成，三段式出餐流程' },
                { icon: '💰', title: '結帳管理', desc: '現金 / 掃碼支付，單筆獨立結帳' },
                { icon: '✏️', title: '訂單修改', desc: '修改品項數量、刪除品項、即時更新金額' },
                { icon: '🧾', title: '列印收據', desc: '一鍵列印訂單明細，支援熱感應印表機' },
                { icon: '📊', title: '營收報表', desc: '營收趨勢、銷售排行、翻桌率、月度對比' },
                { icon: '🔲', title: 'QR Code', desc: '自動產生桌號 QR，列印後護貝即用' },
              ].map((item) => (
                <div key={item.title} className="bg-background rounded-xl p-3 border border-border">
                  <h4 className="font-bold text-foreground text-sm mb-0.5">{item.icon} {item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Login */}
        <section id="login" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            2. 登入後台
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              後台管理系統需要帳號密碼登入，確保只有授權人員可以操作。
            </p>

            <h4 className="font-bold text-foreground">登入畫面說明：</h4>
            <p className="text-sm text-muted-foreground mb-3">
              登入頁面顯示店名「後台管理 · 虎秋文昌雞」，有「登入」與「註冊」兩個頁籤，
              輸入電子郵件和密碼後點擊登入按鈕即可進入後台。
            </p>

            <h4 className="font-bold text-foreground">操作步驟：</h4>
            <div className="space-y-3">
              <StepItem num={1}>
                <p className="font-medium">開啟後台網址</p>
                <p className="text-muted-foreground">在 iPad Safari 輸入 <code className="bg-muted px-2 py-0.5 rounded text-xs">/admin/login</code>，或從首頁底部點擊「⚙️ 後台管理」連結</p>
              </StepItem>
              <StepItem num={2}>
                <p className="font-medium">輸入帳號密碼</p>
                <p className="text-muted-foreground">在「電子郵件」欄輸入管理員 Email，「密碼」欄輸入密碼（至少 6 個字元），點擊紅色「登入」按鈕</p>
              </StepItem>
              <StepItem num={3}>
                <p className="font-medium">進入後台</p>
                <p className="text-muted-foreground">登入成功後自動跳轉至後台桌況管理畫面</p>
              </StepItem>
            </div>

            <h4 className="font-bold text-foreground">首次註冊：</h4>
            <div className="space-y-3">
              <StepItem num={1}>
                <p className="text-muted-foreground">點擊「註冊」頁籤，輸入<strong>顯示名稱</strong>、Email 和密碼</p>
              </StepItem>
              <StepItem num={2}>
                <p className="text-muted-foreground">點擊「註冊」按鈕完成帳號建立</p>
              </StepItem>
            </div>

            <h4 className="font-bold text-foreground">登出系統：</h4>
            <p className="text-sm text-muted-foreground">
              點擊後台右上角 <strong>➡️ 登出按鈕</strong> 即可安全登出，返回登入頁面。
            </p>

            <TipBox>建議將後台網址加入 iPad 主畫面（Safari → 分享 → 加入主畫面），方便每天快速開啟。</TipBox>
          </div>
        </section>

        {/* 3. Tables */}
        <section id="tables" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            3. 桌況管理
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-warm">
            <img src="/manual/screenshot-tables.jpg" alt="桌況管理畫面" className="w-full" />
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              桌況管理是後台的<strong>主畫面</strong>，登入後預設顯示此視圖。以 <strong>5×2 宮格</strong> 呈現 10 張桌位的即時狀態。
              點擊頂部 <strong>👥 人形圖示</strong> 可隨時切換回此視圖。
            </p>
            
            <h4 className="font-bold text-foreground">桌位卡片資訊：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li><strong>桌號</strong>：顯示「桌 1」~「桌 10」</li>
              <li><strong>狀態文字</strong>：空桌 / 待確認 / 製作中 / 待結帳</li>
              <li><strong>計時器</strong>：⏱ 顯示從第一筆訂單開始的用餐時間</li>
              <li><strong>金額</strong>：顯示該桌未付款訂單的總金額</li>
              <li><strong>狀態圓點</strong>：右上角圓點以顏色區分狀態</li>
            </ul>

            <h4 className="font-bold text-foreground">桌位狀態一覽：</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left text-foreground">狀態</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">圓點顏色</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">卡片邊框</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">說明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">空桌</td>
                    <td className="border border-border px-3 py-2"><span className="inline-block w-3 h-3 rounded-full bg-muted-foreground/30" /></td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">灰色虛線</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">無未付訂單，半透明顯示</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">待確認</td>
                    <td className="border border-border px-3 py-2"><span className="inline-block w-3 h-3 rounded-full bg-accent animate-pulse" /></td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">橘色邊框</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">有新訂單等待接單（圓點閃爍提示）</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">製作中</td>
                    <td className="border border-border px-3 py-2"><span className="inline-block w-3 h-3 rounded-full bg-red-500" /></td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">紅色邊框</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">廚房正在製作餐點</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">待結帳</td>
                    <td className="border border-border px-3 py-2"><span className="inline-block w-3 h-3 rounded-full bg-green-500" /></td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">綠色邊框</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">所有餐點已完成，等待客人結帳</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-bold text-foreground mt-4">計時器顏色提示：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li><span className="text-primary font-bold">棕色</span>：用餐時間 60 分鐘以內（正常）</li>
              <li><span className="text-orange-500 font-bold">橘色</span>：用餐時間超過 60 分鐘（提醒注意）</li>
              <li><span className="text-red-500 font-bold">紅色</span>：用餐時間超過 90 分鐘（需要關注）</li>
            </ul>

            <TipBox>當桌位的所有訂單都已付款且完成，桌位會自動變回「空桌」狀態，不需手動清除。</TipBox>
          </div>
        </section>

        {/* 4. Table Detail */}
        <section id="table-detail" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            4. 桌位詳情操作
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              在桌況管理畫面中，<strong>點擊任一桌位卡片</strong>，底部會展開該桌的訂單詳情面板，
              顯示標題如「桌 1 · 2 筆訂單」。
            </p>

            <h4 className="font-bold text-foreground">詳情面板包含：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>每筆訂單的<strong>狀態圖示</strong>（⏳ 待確認 / 🍳 製作中 / ✅ 已完成）和<strong>下單時間</strong></li>
              <li>訂單的<strong>品項清單</strong>：品名 ×數量 和對應金額</li>
              <li>訂單的<strong>總金額</strong>（以醒目大字呈現）</li>
              <li>每筆訂單的<strong>操作按鈕</strong>（根據訂單狀態不同而變化）</li>
            </ul>

            <h4 className="font-bold text-foreground">各狀態可用按鈕：</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left text-foreground">訂單狀態</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">可用按鈕</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">待確認</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">列印 · 修改 · 結帳 · <strong className="text-primary">接單</strong> · 取消</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">製作中</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">列印 · 修改 · 結帳 · <strong className="text-green-600">出餐完成</strong></td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">已完成</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">列印 · 結帳</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">已付款</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">列印（已付款訂單不再顯示其他按鈕）</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <TipBox>點擊另一張桌位可切換詳情面板，再次點擊同一桌位可收合面板。</TipBox>
          </div>
        </section>

        {/* 5. Orders */}
        <section id="orders" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            5. 訂單追蹤（看板視圖）
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              點擊頂部的 <strong>🕐 時鐘圖示</strong> 切換到訂單追蹤視圖。此視圖以<strong>三欄看板</strong>方式
              展示所有訂單（包含內用和外帶），適合快速總覽所有訂單的處理進度。
            </p>
            <p className="text-sm text-muted-foreground">
              時鐘圖示上方的 <strong className="text-destructive">紅色數字</strong> 代表目前「待確認」的訂單數量，有新訂單時一目了然。
            </p>

            <h4 className="font-bold text-foreground">三欄看板說明：</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-accent/10 border border-accent rounded-xl p-3 text-center">
                <p className="font-bold text-accent-foreground">⏳ 待確認</p>
                <p className="text-xs text-muted-foreground mt-1">新訂單等待接單</p>
                <p className="text-sm text-foreground mt-2">👉 點「<strong>接單</strong>」</p>
                <p className="text-xs text-muted-foreground">或「<strong>取消</strong>」</p>
              </div>
              <div className="bg-primary/5 border border-primary/40 rounded-xl p-3 text-center">
                <p className="font-bold text-primary">🍳 製作中</p>
                <p className="text-xs text-muted-foreground mt-1">廚房正在準備</p>
                <p className="text-sm text-foreground mt-2">👉 點「<strong>出餐完成</strong>」</p>
              </div>
              <div className="bg-green-50 border border-green-400 rounded-xl p-3 text-center">
                <p className="font-bold text-green-700">✅ 已完成</p>
                <p className="text-xs text-muted-foreground mt-1">等待結帳</p>
                <p className="text-sm text-foreground mt-2">👉 點「<strong>結帳</strong>」</p>
              </div>
            </div>

            <h4 className="font-bold text-foreground">訂單卡片資訊：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li><strong>類型與桌號</strong>：如「內用 · 桌3」或「外帶」</li>
              <li><strong>下單時間</strong>：如「上午09:37」</li>
              <li><strong>付款狀態</strong>：右上角標記「未付」（橘色）或「已付 · 現金/掃碼支付」（綠色）</li>
              <li><strong>品項清單</strong>：每個品項名稱 ×數量 和金額</li>
              <li><strong>訂單總金額</strong>：左下角大字顯示</li>
              <li><strong>操作按鈕</strong>：列印 🖨️、修改 ✏️、結帳 💰、接單/出餐完成/取消</li>
            </ul>

            <TipBox>
              訂單看板同時顯示內用和外帶訂單。外帶訂單不會出現在桌況管理中，但會顯示在這裡。
            </TipBox>

            <WarnBox>
              只有「待確認」狀態的訂單可以取消。接單後如需修改，請使用「修改」功能調整品項。
            </WarnBox>
          </div>
        </section>

        {/* 6. Edit Order */}
        <section id="edit-order" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            6. 修改訂單
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-warm">
            <img src="/manual/screenshot-edit.jpg" alt="修改訂單彈窗" className="w-full" />
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              當菜品售完或客人臨時要修改，可在後台直接修改訂單內容。修改彈窗會顯示訂單的所有品項，
              可個別調整數量或刪除。
            </p>
            <h4 className="font-bold text-foreground">操作步驟：</h4>
            <div className="space-y-3">
              <StepItem num={1}>在訂單卡片上點擊 <strong>「✏️ 修改」</strong> 按鈕，開啟修改彈窗</StepItem>
              <StepItem num={2}>使用 <strong>+/−</strong> 按鈕調整品項數量（最少為 1）</StepItem>
              <StepItem num={3}>點擊 <strong>🗑️ 刪除按鈕</strong> 可移除不需要的品項</StepItem>
              <StepItem num={4}>彈窗底部會顯示 <strong>原金額 → 新金額</strong> 的對比，方便確認差異</StepItem>
              <StepItem num={5}>確認無誤後點擊 <strong>「儲存修改」</strong> 完成更新</StepItem>
            </div>

            <h4 className="font-bold text-foreground">修改彈窗顯示內容：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>每個品項的名稱、已選選項（如「全雞」「半雞」）</li>
              <li>每個品項的單價 × 數量 = 小計</li>
              <li>如有備註也會顯示</li>
              <li>底部：舊總金額（刪除線）→ 新總金額</li>
            </ul>

            <WarnBox>已付款或已取消的訂單無法修改。如需修改已結帳訂單，請聯繫管理員。</WarnBox>
          </div>
        </section>

        {/* 7. Checkout */}
        <section id="checkout" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            7. 結帳流程
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              本系統採用 <strong>單筆訂單獨立結帳</strong> 機制。同一桌可能有多筆訂單（如客人加點），
              每筆訂單都可以獨立結帳，天然支援分帳需求。
            </p>

            <h4 className="font-bold text-foreground">結帳步驟：</h4>
            <div className="space-y-3">
              <StepItem num={1} color="bg-green-600 text-white">
                在訂單卡片上點擊 <strong>「💰 結帳」</strong> 按鈕（綠色按鈕）
              </StepItem>
              <StepItem num={2} color="bg-green-600 text-white">
                <div>
                  <p>彈出結帳視窗，顯示：</p>
                  <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                    <li>訂單類型與桌號（如「內用 · 桌3」）</li>
                    <li>大字醒目金額（如 $340）</li>
                  </ul>
                </div>
              </StepItem>
              <StepItem num={3} color="bg-green-600 text-white">
                <div>
                  <p>選擇付款方式：</p>
                  <div className="flex gap-3 mt-2">
                    <div className="bg-green-600 text-white rounded-xl px-5 py-2.5 text-center font-bold text-sm">
                      💵 現金
                    </div>
                    <div className="bg-blue-600 text-white rounded-xl px-5 py-2.5 text-center font-bold text-sm">
                      📱 掃碼支付
                    </div>
                  </div>
                </div>
              </StepItem>
            </div>

            <OkBox>
              <strong>結帳完成後：</strong>該訂單標記為「已付款」，卡片上顯示「已付 · 現金」或「已付 · 掃碼支付」（綠色標籤）。
              桌位上所有訂單都結帳後，桌位自動變回空桌。
            </OkBox>

            <TipBox>
              結帳彈窗底部有「取消」按鈕，可返回不結帳。任何未結帳的訂單仍會顯示在桌況和訂單追蹤中。
            </TipBox>
          </div>
        </section>

        {/* 8. Receipt */}
        <section id="receipt" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            8. 列印收據
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              每筆訂單都可以列印收據，方便提供給客人作為付款憑證或確認餐點。
            </p>
            <h4 className="font-bold text-foreground">操作步驟：</h4>
            <div className="space-y-3">
              <StepItem num={1}>在訂單卡片上點擊 <strong>「🖨️ 列印」</strong> 圖示按鈕</StepItem>
              <StepItem num={2}>系統彈出收據預覽視窗，顯示完整的訂單明細</StepItem>
              <StepItem num={3}>點擊收據視窗中的 <strong>「🖨️ 列印」</strong> 按鈕</StepItem>
              <StepItem num={4}>系統自動開啟瀏覽器列印對話框，選擇印表機後列印</StepItem>
            </div>

            <h4 className="font-bold text-foreground">收據內容包含：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>店名「虎秋文昌雞」</li>
              <li>訂單編號（前 8 碼）</li>
              <li>訂單類型（內用/外帶）、桌號</li>
              <li>下單時間</li>
              <li>客戶姓名（如有填寫）</li>
              <li>餐點明細：品名、數量、已選選項、小計</li>
              <li>備註（如有）</li>
              <li>合計金額（粗體醒目）</li>
            </ul>

            <TipBox icon="🖨️" title="印表機設定">
              建議連接 80mm 熱感應印表機。收據寬度自動適配 280px（約 80mm），格式為窄版直式，適合一般出單機。
            </TipBox>
          </div>
        </section>

        {/* 9. Reports */}
        <section id="reports" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            9. 營收報表
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              點擊頂部的 <strong>📊 長條圖圖示</strong> 進入營收報表頁面。報表頁面左上角有返回箭頭可回到後台主頁。
            </p>

            <h4 className="font-bold text-foreground">時間篩選：</h4>
            <p className="text-sm text-muted-foreground mb-2">
              右上角提供三個篩選按鈕：<strong>今日</strong>、<strong>近 7 天</strong>、<strong>近 30 天</strong>，
              點擊後所有數據即時更新。
            </p>

            <h4 className="font-bold text-foreground">KPI 總覽卡片（頂部橫列）：</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left text-foreground">指標</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">圖示</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">說明</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['營收總額', '💰', '已付款訂單的營收總計'],
                    ['訂單數', '📋', '篩選期間的訂單總筆數'],
                    ['平均客單價', '📈', '營收總額 ÷ 訂單數'],
                    ['待收款', '📅', '尚未付款的訂單金額總計'],
                    ['平均用餐時間', '⏱', '從下單到完成的平均時間'],
                    ['翻桌次數', '🔄', '篩選期間桌位被使用的總次數'],
                    ['平均出餐時間', '🍽️', '從接單到出餐完成的平均時間'],
                  ].map(([name, icon, desc]) => (
                    <tr key={name}>
                      <td className="border border-border px-3 py-2 text-foreground font-medium">{name}</td>
                      <td className="border border-border px-3 py-2">{icon}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="font-bold text-foreground">圖表模組：</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left text-foreground">模組</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">圖表類型</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">說明</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['🏆 商品銷售排行', '橫條圖', '各品項銷售數量 Top 10'],
                    ['📊 品類營收佔比', '圓餅圖', '切盤/飯類/小菜/飲品的營收比例'],
                    ['📅 月度營業額評比', '表格', '近 12 個月趨勢對比，含環比增長率'],
                    ['📈 每日營收趨勢', '折線圖', '每日營收變化趨勢'],
                    ['🔄 翻桌率統計', '長條圖', '每日桌位使用次數'],
                    ['⏱ 出餐時間分析', '長條圖', '各時段平均出餐時間'],
                  ].map(([name, type, desc]) => (
                    <tr key={name}>
                      <td className="border border-border px-3 py-2 text-foreground font-medium">{name}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">{type}</td>
                      <td className="border border-border px-3 py-2 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 className="font-bold text-foreground">訂單明細表（底部）：</h4>
            <p className="text-sm text-muted-foreground">
              頁面最下方有完整的訂單明細表格，顯示最近 50 筆訂單，包含：訂單編號、類型、桌號、品項數、
              金額、下單時間、訂單狀態（待確認/製作中/已完成/已取消）、付款狀態（未付款/已付款＋方式）。
            </p>

            <TipBox>歸零後的歷史訂單仍保留在報表中，方便長期追蹤營收走勢。報表頁面會自動載入含封存的所有訂單數據。</TipBox>
          </div>
        </section>

        {/* 10. QR Codes */}
        <section id="qr-codes" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            10. 桌號 QR Code
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-warm">
            <img src="/manual/screenshot-qr.jpg" alt="桌號 QR Code 畫面" className="w-full" />
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              點擊頂部的 <strong>🔲 QR Code 圖示</strong>（金色按鈕）進入桌號 QR Code 管理頁面。
              左上角有返回箭頭可回到後台。
            </p>

            <h4 className="font-bold text-foreground">頁面功能：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>以卡片網格呈現每張桌子的專屬 QR Code</li>
              <li>每張卡片顯示：桌號、店名「虎秋文昌雞」、QR Code 圖片、對應的菜單連結網址</li>
              <li>客人掃碼後自動開啟菜單頁面，桌號已自動帶入（如 <code className="bg-muted px-1 rounded text-xs">/menu?table=3</code>）</li>
            </ul>

            <h4 className="font-bold text-foreground">操作說明：</h4>
            <div className="space-y-3">
              <StepItem num={1}>右上角「桌數」輸入框可調整桌數（預設 10 桌，最多 50 桌）</StepItem>
              <StepItem num={2}>點擊 <strong>「🖨️ 列印全部」</strong> 按鈕，一次列印所有桌號 QR Code</StepItem>
              <StepItem num={3}>列印後護貝，用立牌放置於各桌桌面</StepItem>
            </div>

            <TipBox>QR Code 指向的網址為系統的正式發佈網址，確保客人掃碼後可以正常使用，不需要任何登入。</TipBox>
          </div>
        </section>

        {/* 11. Customer Order */}
        <section id="customer-order" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            11. 客人點餐流程
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-warm max-w-xs mx-auto">
            <img src="/manual/screenshot-menu.jpg" alt="客人點餐畫面" className="w-full" />
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              客人用手機掃描桌上 QR Code，即可在手機上自助點餐。全程不需下載 App，不需註冊帳號。
            </p>

            <h4 className="font-bold text-foreground">首頁入口：</h4>
            <p className="text-sm text-muted-foreground mb-2">
              系統首頁顯示品牌 Logo、店名「虎秋文昌雞」、副標「正宗港式燒味 · 即叫即切」，
              以及一個大型的 <strong>「開始點餐」</strong> 紅色按鈕。底部有小型「⚙️ 後台管理」連結供店員使用。
            </p>

            <h4 className="font-bold text-foreground">點餐步驟：</h4>
            <div className="space-y-3">
              {[
                '掃描桌上 QR Code，手機自動開啟菜單頁面（桌號已帶入，類型自動設為「內用」）',
                '頂部顯示店名，下方有分類導航列可快速跳轉：切盤、飯類、小菜、飲品、假日限定',
                '瀏覽菜單，點擊品項右側的 「+」 按鈕開啟詳情彈窗',
                '在詳情彈窗中可選擇部位/份量（如全雞/半雞/四分之一雞），填寫備註，調整數量',
                '點擊「加入購物車 $XX」按鈕將品項加入購物車',
                '點擊右下角浮動的購物車按鈕（顯示品項數量和總金額）開啟購物車抽屜',
                '在購物車中可調整數量（+/−）或刪除品項',
                '確認無誤後，選擇用餐方式（內用已自動帶入桌號 / 外帶可填姓名電話）',
                '點擊「送出訂單」完成下單，訂單即時傳送至後台',
              ].map((text, i) => (
                <StepItem key={i} num={i + 1}>{text}</StepItem>
              ))}
            </div>

            <h4 className="font-bold text-foreground">菜單品項詳情彈窗：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>品項照片（大圖）</li>
              <li>品名與說明文字</li>
              <li>可選選項按鈕（如「全雞 $220」「半雞 $110」），價格會自動調整</li>
              <li>備註輸入框（如「不要蔥」「加辣」）</li>
              <li>底部：數量調整（−/+）和「加入購物車 $XX」按鈕</li>
            </ul>

            <TipBox>客人無需下載任何 App，也不需登入帳號，掃碼後即可直接點餐。菜單支援手機直式瀏覽，操作簡單直覺。</TipBox>
          </div>
        </section>

        {/* 12. Order Status */}
        <section id="order-status" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            12. 客人訂單狀態查詢
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              客人送出訂單後，系統會自動跳轉到<strong>訂單狀態頁面</strong>，即時顯示訂單的處理進度。
              此頁面會<strong>自動更新</strong>，當後台接單或出餐時，客人手機上的狀態會即時變化。
            </p>

            <h4 className="font-bold text-foreground">頁面顯示內容：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>左上角返回箭頭（回到菜單）</li>
              <li>訂單狀態圖示與文字（大字醒目顯示）</li>
              <li>訂單編號（前 8 碼）</li>
              <li>訂單類型和桌號（如「內用 · 桌3」）</li>
              <li>完整品項清單：品名 ×數量、已選選項、備註、小計</li>
              <li>合計金額</li>
            </ul>

            <h4 className="font-bold text-foreground">狀態變化流程：</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left text-foreground">狀態</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">圖示</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">顏色</th>
                    <th className="border border-border px-3 py-2 text-left text-foreground">客人看到的訊息</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">待確認</td>
                    <td className="border border-border px-3 py-2">⏳</td>
                    <td className="border border-border px-3 py-2 text-orange-500">橘色</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">訂單已送出，等待餐廳確認</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">製作中</td>
                    <td className="border border-border px-3 py-2">🍳</td>
                    <td className="border border-border px-3 py-2 text-blue-500">藍色</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">餐廳已接單，廚房製作中</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">已完成</td>
                    <td className="border border-border px-3 py-2">✅</td>
                    <td className="border border-border px-3 py-2 text-green-500">綠色</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">餐點已準備完成</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-3 py-2 text-foreground font-medium">已取消</td>
                    <td className="border border-border px-3 py-2">❌</td>
                    <td className="border border-border px-3 py-2 text-red-500">紅色</td>
                    <td className="border border-border px-3 py-2 text-muted-foreground">訂單已被取消</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <TipBox>此頁面使用即時訂閱技術，不需要手動重新整理。後台一操作，客人手機上立即更新狀態。</TipBox>
          </div>
        </section>

        {/* 13. Reset */}
        <section id="reset" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            13. 每日歸零
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            <p className="text-foreground leading-relaxed">
              每天營業結束後需要將桌況歸零，將今日訂單封存，為下一天營業做準備。
            </p>

            <h4 className="font-bold text-foreground">手動歸零：</h4>
            <div className="space-y-3">
              <StepItem num={1} color="bg-destructive text-white">
                點擊後台右上角 <strong>🗑️ 紅色歸零按鈕</strong>
              </StepItem>
              <StepItem num={2} color="bg-destructive text-white">
                <div>
                  <p>彈出確認視窗，顯示：</p>
                  <ul className="list-disc pl-5 mt-1 text-muted-foreground">
                    <li>「將今日訂單封存歸檔，桌況清空歸零」</li>
                    <li>「封存的訂單仍可在營收報表中查看」</li>
                  </ul>
                </div>
              </StepItem>
              <StepItem num={3} color="bg-destructive text-white">
                點擊 <strong>「確認歸零」</strong> 紅色按鈕完成操作（或「取消」放棄）
              </StepItem>
            </div>

            <h4 className="font-bold text-foreground mt-3">歸零的效果：</h4>
            <ul className="list-disc pl-5 text-foreground space-y-1 text-sm">
              <li>所有訂單被標記為「已封存」（is_archived），從桌況和訂單追蹤中消失</li>
              <li>所有桌位回到空桌狀態</li>
              <li>封存的訂單<strong>不會被刪除</strong>，在營收報表中仍可查看</li>
            </ul>

            <OkBox>
              <strong>重要：</strong>歸零只會封存（歸檔）訂單，<strong>不會刪除任何資料</strong>。
              所有歷史訂單在營收報表中仍可查看，不影響營收統計。
            </OkBox>

            <TipBox>
              建議每天打烊後手動歸零，確保隔天開店時桌況乾淨。如果忘記歸零，也不影響隔天新訂單的接收。
            </TipBox>
          </div>
        </section>

        {/* 14. FAQ */}
        <section id="faq" className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            14. 常見問題
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm space-y-4">
            {[
              { q: '客人掃了 QR Code 但無法開啟菜單？', a: '請確認客人手機有網路連線，且 QR Code 未損壞。如 QR 模糊不清，可重新列印。' },
              { q: '桌位計時器顯示很長的時間怎麼辦？', a: '可能是前一批客人的訂單尚未結帳。請先結帳或使用歸零功能清除。' },
              { q: '同一桌客人想分開結帳？', a: '本系統採用單筆訂單獨立結帳，每筆訂單都有自己的結帳按鈕，天然支援分帳。' },
              { q: '外帶訂單在哪裡處理？', a: '外帶訂單不會出現在桌況管理中，請切換到「訂單追蹤」（🕐 時鐘圖示）視圖查看和處理。' },
              { q: '客人點了餐但後台沒收到？', a: '請確認 iPad 有網路連線。訂單是即時傳送的，如果網路正常，訂單會立刻出現在後台。可嘗試重新整理頁面。' },
              { q: '報表資料是否包含歸零前的訂單？', a: '是的。歸零只是封存，所有歷史訂單在報表中都可以查看。報表會自動載入含封存的完整數據。' },
              { q: '如何增加桌數？', a: '在 QR Code 頁面（🔲）右上角調整桌數數字即可，最多支援 50 桌。' },
              { q: '可以同時在多台裝置操作後台嗎？', a: '可以。系統使用即時同步技術，多台裝置上的數據會自動保持一致。' },
              { q: '如何新增管理員帳號？', a: '在登入頁面切換到「註冊」頁籤，填寫顯示名稱、Email 和密碼即可建立新帳號。' },
              { q: '已接單的訂單可以取消嗎？', a: '不行。只有「待確認」狀態的訂單可以取消。已接單的訂單可以透過「修改」功能調整品項。' },
            ].map((item, i) => (
              <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="font-medium text-foreground text-sm">❓ {item.q}</p>
                <p className="text-sm text-muted-foreground mt-1">→ {item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Appendix: Header Icons */}
        <section className="space-y-4">
          <h2 className="font-serif-tc font-bold text-2xl text-foreground border-b-2 border-primary pb-2">
            附錄：後台頂部按鈕說明
          </h2>
          <div className="bg-card rounded-2xl border border-border p-6 shadow-warm">
            <p className="text-sm text-muted-foreground mb-4">
              後台頂部深色工具列由左至右排列以下按鈕：
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: '👥', name: '桌況', desc: '切換到桌況管理視圖（10 宮格）' },
                { icon: '🕐', name: '訂單', desc: '切換到訂單追蹤視圖（三欄看板）' },
                { icon: '📊', name: '報表', desc: '進入營收報表頁面' },
                { icon: '🔲', name: 'QR Code', desc: '進入桌號 QR Code 頁面（金色按鈕）' },
                { icon: '🗑️', name: '歸零', desc: '手動封存今日訂單（紅色按鈕）' },
                { icon: '➡️', name: '登出', desc: '安全登出系統' },
              ].map((btn) => (
                <div key={btn.name} className="flex items-center gap-2.5 bg-background rounded-xl p-3 border border-border">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-lg shrink-0">{btn.icon}</div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{btn.name}</p>
                    <p className="text-xs text-muted-foreground">{btn.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p className="font-serif-tc font-bold text-foreground mb-1">虎秋文昌雞 · 系統操作手冊 v3.0</p>
          <p>更新日期：{new Date().toLocaleDateString('zh-TW')} · 如有任何問題請聯繫系統管理員</p>
        </div>
      </div>
    </div>
  );
};

export default ManualPage;
