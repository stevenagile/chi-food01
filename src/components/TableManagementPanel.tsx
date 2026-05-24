import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, DollarSign, Banknote, Smartphone, Timer, Pencil } from 'lucide-react';
import type { Order } from '@/data/menu';
import { useOrderStore } from '@/store/useOrderStore';
import { useToast } from '@/hooks/use-toast';

interface TableStatus {
  tableNumber: string;
  orders: Order[];
  status: 'empty' | 'pending' | 'cooking' | 'ready';
  totalAmount: number;
  earliestTime: Date | null;
}

const formatElapsed = (start: Date, now: Date): string => {
  const diff = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (h > 0) return `${h}h${m}m`;
  return `${m}m`;
};

const getTimerColor = (start: Date, now: Date): string => {
  const mins = (now.getTime() - start.getTime()) / 60000;
  if (mins >= 90) return 'text-red-500';
  if (mins >= 60) return 'text-orange-500';
  return 'text-muted-foreground';
};

interface Props {
  orders: Order[];
  tableCount?: number;
  onPrintReceipt: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}

const TableManagementPanel = ({ orders, tableCount = 10, onPrintReceipt, onEditOrder }: Props) => {
  const { updateOrderStatus, updatePaymentStatus } = useOrderStore();
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const tableStatuses = useMemo(() => {
    const tables: TableStatus[] = [];
    for (let i = 1; i <= tableCount; i++) {
      const num = String(i);
      const unpaidOrders = orders.filter(
        (o) => o.tableNumber === num && o.type === '內用' && o.status !== '已取消' && o.paymentStatus !== '已付款'
      );

      let status: TableStatus['status'] = 'empty';
      if (unpaidOrders.length > 0) {
        if (unpaidOrders.some((o) => o.status === '待確認')) status = 'pending';
        else if (unpaidOrders.some((o) => o.status === '製作中')) status = 'cooking';
        else if (unpaidOrders.every((o) => o.status === '已完成')) status = 'ready';
      }

      const earliestTime = unpaidOrders.length > 0
        ? new Date(Math.min(...unpaidOrders.map((o) => new Date(o.createdAt).getTime())))
        : null;

      tables.push({
        tableNumber: num,
        orders: unpaidOrders,
        status,
        totalAmount: unpaidOrders.reduce((s, o) => s + o.total, 0),
        earliestTime,
      });
    }
    return tables;
  }, [orders, tableCount]);

  const statusConfig = {
    empty: { label: '空桌', bg: 'bg-muted/50', border: 'border-border', text: 'text-muted-foreground', dot: 'bg-muted-foreground/30' },
    pending: { label: '待確認', bg: 'bg-accent/10', border: 'border-accent', text: 'text-accent-foreground', dot: 'bg-accent animate-pulse' },
    cooking: { label: '製作中', bg: 'bg-primary/5', border: 'border-primary/40', text: 'text-primary', dot: 'bg-primary' },
    ready: { label: '待結帳', bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700', dot: 'bg-green-500' },
  };

  const handleOrderPayment = async (order: Order, method: '現金' | '掃碼支付') => {
    await updatePaymentStatus(order.id, '已付款', method);
    if (order.status !== '已完成') {
      await updateOrderStatus(order.id, '已完成');
    }
    setPaymentOrder(null);
    toast({
      title: '結帳完成',
      description: `桌 ${order.tableNumber} · ${method} · $${order.total}`,
    });
  };

  const selected = selectedTable ? tableStatuses.find((t) => t.tableNumber === selectedTable) : null;

  return (
    <div>
      {/* Table Grid — large touch targets for iPad */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {tableStatuses.map((table) => {
          const cfg = statusConfig[table.status];
          const isSelected = selectedTable === table.tableNumber;
          return (
            <motion.button
              key={table.tableNumber}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedTable(isSelected ? null : table.tableNumber)}
              className={`relative rounded-2xl border-2 transition-all text-center min-h-[100px] flex flex-col items-center justify-center gap-1 ${cfg.bg} ${cfg.border} ${cfg.text} ${
                isSelected ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]' : ''
              } ${table.status === 'empty' ? 'opacity-50' : ''}`}
            >
              <div className={`absolute top-2.5 right-2.5 w-3 h-3 rounded-full ${cfg.dot}`} />
              <span className="font-serif-tc font-bold text-xl">桌 {table.tableNumber}</span>
              <span className="text-xs font-medium">{cfg.label}</span>
              {table.status !== 'empty' && (
                <>
                  {table.earliestTime && (
                    <span className={`text-xs ${getTimerColor(table.earliestTime, now)}`}>
                      <Timer size={11} className="inline mr-0.5" />
                      {formatElapsed(table.earliestTime, now)}
                    </span>
                  )}
                  <span className="font-bold text-base">${table.totalAmount}</span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected Table Detail */}
      <AnimatePresence mode="wait">
        {selected && selected.status !== 'empty' && (
          <motion.div
            key={selected.tableNumber}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-warm"
          >
            <h3 className="font-serif-tc font-bold text-lg text-foreground mb-4">
              桌 {selected.tableNumber} · {selected.orders.length} 筆訂單
            </h3>

            <div className="space-y-3">
              {selected.orders.map((order) => {
                const StatusIcon = order.status === '待確認' ? Clock : order.status === '製作中' ? ChefHat : CheckCircle2;
                return (
                  <div key={order.id} className="bg-background rounded-xl p-4 border border-border">
                    {/* Order header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon size={16} className="text-muted-foreground" />
                        <span className="font-medium">{order.status}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-serif-tc font-bold text-primary text-lg">${order.total}</span>
                    </div>

                    {/* Items — compact */}
                    <div className="space-y-1 mb-3">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span>
                            {item.menuItem.name} ×{item.quantity}
                            {Object.values(item.selectedOptions).length > 0 && (
                              <span className="text-muted-foreground text-xs ml-1">
                                ({Object.values(item.selectedOptions).join(', ')})
                              </span>
                            )}
                          </span>
                          <span className="text-muted-foreground">${item.menuItem.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action buttons — large touch targets */}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onPrintReceipt(order)}
                        className="px-4 py-2.5 text-sm text-muted-foreground bg-muted rounded-xl font-medium"
                      >
                        列印
                      </button>
                      {onEditOrder && order.status !== '已取消' && order.paymentStatus !== '已付款' && (
                        <button
                          onClick={() => onEditOrder(order)}
                          className="px-5 py-2.5 text-sm bg-muted rounded-xl font-medium flex items-center gap-1.5"
                        >
                          <Pencil size={16} />修改
                        </button>
                      )}
                      {order.status === '待確認' && (
                        <>
                          <button
                            onClick={() => updateOrderStatus(order.id, '製作中')}
                            className="px-6 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl font-bold"
                          >
                            接單
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, '已取消')}
                            className="px-4 py-2.5 text-sm bg-muted text-destructive rounded-xl font-medium"
                          >
                            取消
                          </button>
                        </>
                      )}
                      {order.status === '製作中' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, '已完成')}
                          className="px-6 py-2.5 text-sm bg-green-600 text-white rounded-xl font-bold"
                        >
                          出餐完成
                        </button>
                      )}
                      {order.status === '已完成' && order.paymentStatus !== '已付款' && (
                        <button
                          onClick={() => setPaymentOrder(order)}
                          className="px-6 py-2.5 text-sm bg-green-600 text-white rounded-xl font-bold flex items-center gap-1.5"
                        >
                          <DollarSign size={16} />
                          結帳 ${order.total}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal — big buttons for iPad */}
      <AnimatePresence>
        {paymentOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setPaymentOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-8 max-w-md w-full mx-4 shadow-warm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-serif-tc font-bold text-xl text-foreground mb-2">
                桌 {paymentOrder.tableNumber} · 結帳
              </h3>
              <div className="text-sm text-muted-foreground mb-4 space-y-0.5">
                {paymentOrder.items.map((item, i) => (
                  <div key={i}>{item.menuItem.name} ×{item.quantity}</div>
                ))}
              </div>
              <p className="text-4xl font-serif-tc font-bold text-primary mb-8 text-center">
                ${paymentOrder.total}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleOrderPayment(paymentOrder, '現金')}
                  className="py-6 bg-green-600 text-white rounded-2xl font-bold text-lg flex flex-col items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  <Banknote size={36} />
                  現金
                </button>
                <button
                  onClick={() => handleOrderPayment(paymentOrder, '掃碼支付')}
                  className="py-6 bg-blue-600 text-white rounded-2xl font-bold text-lg flex flex-col items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                >
                  <Smartphone size={36} />
                  掃碼支付
                </button>
              </div>
              <button
                onClick={() => setPaymentOrder(null)}
                className="w-full mt-4 py-3 bg-muted text-muted-foreground rounded-2xl text-base font-medium"
              >
                取消
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableManagementPanel;
