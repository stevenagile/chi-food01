import { useRef } from 'react';
import type { Order } from '@/data/menu';
import { Printer } from 'lucide-react';

interface OrderReceiptProps {
  order: Order;
  onClose: () => void;
}

const OrderReceipt = ({ order, onClose }: OrderReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
      <head>
        <title>訂單 ${order.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; padding: 8px; width: 280px; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .title { font-size: 16px; font-weight: bold; margin: 4px 0; }
          .small { font-size: 10px; color: #666; }
          .total { font-size: 14px; font-weight: bold; }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>window.onload = () => { window.print(); window.close(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div ref={receiptRef}>
          <div className="center">
            <div className="title">虎秋文昌雞</div>
            <p className="small">正宗港式燒味 · 即叫即切</p>
            <div className="line" />
          </div>
          
          <div className="row">
            <span>訂單編號:</span>
            <span className="bold">{order.id}</span>
          </div>
          <div className="row">
            <span>類型:</span>
            <span>{order.type} {order.tableNumber ? `桌 ${order.tableNumber}` : ''}</span>
          </div>
          <div className="row">
            <span>時間:</span>
            <span>{new Date(order.createdAt).toLocaleString('zh-TW')}</span>
          </div>
          {order.customerName && (
            <div className="row">
              <span>客戶:</span>
              <span>{order.customerName} {order.customerPhone}</span>
            </div>
          )}
          
          <div className="line" />
          
          {order.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <div className="row">
                <span>{item.menuItem.name} x{item.quantity}</span>
                <span>${item.menuItem.price * item.quantity}</span>
              </div>
              {Object.values(item.selectedOptions).length > 0 && (
                <div className="small" style={{ paddingLeft: 8 }}>
                  {Object.values(item.selectedOptions).join(', ')}
                </div>
              )}
              {item.note && (
                <div className="small" style={{ paddingLeft: 8 }}>備註: {item.note}</div>
              )}
            </div>
          ))}
          
          <div className="line" />
          
          <div className="row total">
            <span>合計:</span>
            <span>${order.total}</span>
          </div>
          
          <div className="line" />
          <div className="center small" style={{ marginTop: 8 }}>
            <p>感謝光臨 · 歡迎再來</p>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-gradient-red text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
          >
            <Printer size={16} />
            列印
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-muted text-foreground font-medium rounded-xl hover:bg-muted/80"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderReceipt;
