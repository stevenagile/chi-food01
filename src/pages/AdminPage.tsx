import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuth } from '@/hooks/useAuth';
import type { Order } from '@/data/menu';
import { menuItems } from '@/data/menu';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Trash2, ChefHat, CheckCircle2, Printer, DollarSign, LayoutGrid, AlertTriangle, Pencil, Store, Bike, ChevronDown, ChevronRight } from 'lucide-react';
import TableManagementPanel from '@/components/TableManagementPanel';
import AdminNav from '@/components/AdminNav';
import OrderReceipt from '@/components/OrderReceipt';
import OrderEditModal from '@/components/OrderEditModal';
import OrderStatusLog from '@/components/OrderStatusLog';
import { useToast } from '@/hooks/use-toast';
import { useMenuAvailability } from '@/hooks/useMenuAvailability';

const AdminPage = () => {
  const { availability, isSoldOut } = useMenuAvailability();
  const { orders, updateOrderStatus, updatePaymentStatus, fetchOrders, subscribeToOrders, archiveAllOrders, archiveOrder } = useOrderStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [view, setView] = useState<'orders' | 'tables'>('orders');
  const [showCompleted, setShowCompleted] = useState<{ 內用: boolean; 外帶: boolean }>({ 內用: false, 外帶: false });

  const LOW_STOCK_THRESHOLD = 5;
  const lowStockItems = useMemo(() => {
    return Object.entries(availability)
      .filter(([, count]) => count !== Infinity && count <= LOW_STOCK_THRESHOLD)
      .sort(([, a], [, b]) => a - b);
  }, [availability]);

  const handleReset = async () => {
    await archiveAllOrders();
    setShowResetConfirm(false);
    toast({ title: '已歸零', description: '所有訂單已封存，桌況已清空' });
  };

  useEffect(() => {
    fetchOrders();
    const unsubscribe = subscribeToOrders();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckout = async (order: Order) => {
    await updatePaymentStatus(order.id, '已付款', '現金');
    await updateOrderStatus(order.id, '製作中');
    toast({ title: '已結帳', description: `$${order.total} · 進入製作中` });
  };

  const dineInOrders = useMemo(() => orders.filter((o) => o.type === '內用'), [orders]);
  const takeoutOrders = useMemo(() => orders.filter((o) => o.type === '外帶'), [orders]);
  const splitByStatus = (list: Order[]) => ({
    pending: list.filter((o) => o.status === '待確認'),
    inProgress: list.filter((o) => o.status === '製作中'),
    completed: list.filter((o) => o.status === '已完成' || o.status === '已取消'),
  });
  const dineIn = useMemo(() => splitByStatus(dineInOrders), [dineInOrders]);
  const takeout = useMemo(() => splitByStatus(takeoutOrders), [takeoutOrders]);

  const renderOrderCard = (order: Order) => {
    const isPaid = order.paymentStatus === '已付款';
    return (
      <div key={order.id} className="bg-card rounded-lg border border-border p-2.5 shadow-warm text-sm">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">
              {order.type}
              {order.type === '外帶' && order.customerName === 'Foodpanda' ? '（Foodpanda）' : ''}
              {order.tableNumber ? ` · 桌${order.tableNumber}` : ''}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${isPaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
            {isPaid ? '已付' : '未付'}
          </span>
        </div>

        <div className="space-y-0.5 mb-2">
          {order.items.map((item, i) => {
            const stock = availability[item.menuItem.id];
            const isLow = stock !== undefined && stock !== Infinity && stock <= LOW_STOCK_THRESHOLD;
            const soldOut = stock !== undefined && stock <= 0;
            return (
              <div key={i} className="flex justify-between text-xs items-center gap-1">
                <span className="flex items-center gap-1 min-w-0">
                  <span className="truncate">{item.menuItem.name} ×{item.quantity}</span>
                  {soldOut && (
                    <span className="text-[9px] px-1 py-0.5 bg-destructive text-destructive-foreground rounded font-bold shrink-0">售完</span>
                  )}
                  {!soldOut && isLow && (
                    <span className="text-[9px] px-1 py-0.5 bg-orange-100 text-orange-700 rounded font-medium shrink-0">剩{stock}</span>
                  )}
                </span>
                <span className="text-muted-foreground shrink-0">${item.menuItem.price * item.quantity}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-2 gap-1.5 flex-wrap">
          <span className="font-bold text-primary text-base">${order.total}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setEditOrder(order)} className="p-1.5 text-muted-foreground rounded-lg hover:bg-muted" title="編輯訂單">
              <Pencil size={14} />
            </button>
            <button onClick={() => setReceiptOrder(order)} className="p-1.5 text-muted-foreground rounded-lg hover:bg-muted" title="列印">
              <Printer size={14} />
            </button>
            {order.status === '待確認' ? (
              <button onClick={async () => {
                if (!isPaid) await updatePaymentStatus(order.id, '已付款', '現金');
                // 外帶不佔桌，跳過「製作中」直接到「結案」
                await updateOrderStatus(order.id, order.type === '外帶' ? '已完成' : '製作中');
              }} className="px-2.5 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-bold flex items-center gap-1">
                <ChefHat size={13} />出餐完成
              </button>
            ) : order.status === '製作中' ? (
              <button onClick={() => updateOrderStatus(order.id, '已完成')} className="px-2.5 py-1.5 text-xs bg-dark-wood text-gold rounded-lg font-bold flex items-center gap-1">
                <CheckCircle2 size={13} />結案
              </button>
            ) : (
              <button onClick={() => archiveOrder(order.id)} className="px-2.5 py-1.5 text-xs bg-muted text-foreground rounded-lg font-bold flex items-center gap-1">
                <CheckCircle2 size={13} />封存
              </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">虎秋文昌雞</h1>
            <button onClick={() => setView(view === 'orders' ? 'tables' : 'orders')} className={`p-2 rounded-xl transition-colors ${view === 'tables' ? 'bg-gold/20 text-gold' : 'bg-white/10 hover:bg-white/20'}`} title="桌況管理">
              <LayoutGrid size={18} />
            </button>
          </div>
          <AdminNav />
          <div className="flex items-center gap-2">
            <button onClick={() => setShowResetConfirm(true)} className="p-2 bg-red-600/80 text-white rounded-xl hover:bg-red-600 transition-colors" title="歸零">
              <Trash2 size={18} />
            </button>
            <button onClick={signOut} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="登出">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Low stock alert banner */}
        {lowStockItems.length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-start gap-2">
            <AlertTriangle size={18} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-bold text-orange-800">庫存警示：</span>
              <span className="text-orange-700">
                {lowStockItems.map(([id, count]) => {
                  const item = menuItems.find((m) => m.id === id);
                  const name = item?.name ?? id;
                  return count <= 0 ? `${name}(售完)` : `${name}(剩${count}份)`;
                }).join('、')}
              </span>
            </div>
          </div>
        )}
        {view === 'tables' ? (
          <TableManagementPanel orders={orders} onPrintReceipt={setReceiptOrder} onEditOrder={setEditOrder} />
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">目前沒有訂單</p>
          </div>
        ) : (
          <div className="space-y-8">
            {([
              { label: '內用', icon: <Store size={22} />, data: dineIn, bar: 'bg-primary', tint: 'bg-primary/5 border-primary/30' },
              { label: '外帶', icon: <Bike size={22} />, data: takeout, bar: 'bg-pink-600', tint: 'bg-pink-50 border-pink-200' },
            ] as const).map((lane) => {
              const laneTotal = lane.data.pending.length + lane.data.inProgress.length + lane.data.completed.length;
              return (
                <section key={lane.label} className={`rounded-2xl border-2 ${lane.tint} overflow-hidden shadow-warm`}>
                  <header className={`${lane.bar} text-white px-5 py-3 flex items-center gap-3`}>
                    {lane.icon}
                    <h3 className="font-serif-tc font-bold text-xl tracking-wide">{lane.label}</h3>
                    <span className="ml-auto bg-white/20 text-white font-bold px-3 py-0.5 rounded-full text-sm">
                      {laneTotal} 筆
                    </span>
                  </header>
                  <div className="p-4 grid gap-5" style={{ gridTemplateColumns: showCompleted[lane.label] ? 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr) auto' }}>
                    <div>
                      <h2 className="font-serif-tc font-bold text-foreground mb-3 flex items-center gap-2">
                        <DollarSign size={18} className="text-green-600" />
                        結帳 ({lane.data.pending.length})
                      </h2>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{lane.data.pending.map(renderOrderCard)}</div>
                    </div>
                    <div>
                      <h2 className="font-serif-tc font-bold text-foreground mb-3 flex items-center gap-2">
                        <ChefHat size={18} className="text-primary" />
                        出餐完成 ({lane.data.inProgress.length})
                      </h2>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{lane.data.inProgress.map(renderOrderCard)}</div>
                    </div>
                    <div className={showCompleted[lane.label] ? '' : 'w-auto'}>
                      <button
                        onClick={() => setShowCompleted((s) => ({ ...s, [lane.label]: !s[lane.label] }))}
                        className="mb-3 flex items-center gap-1.5 font-serif-tc font-bold text-foreground hover:text-primary transition-colors text-sm whitespace-nowrap"
                      >
                        {showCompleted[lane.label] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <CheckCircle2 size={16} className="text-dark-wood" />
                        結案 ({lane.data.completed.length})
                      </button>
                      {showCompleted[lane.label] && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{lane.data.completed.map(renderOrderCard)}</div>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {receiptOrder && (
        <OrderReceipt order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editOrder && (
          <OrderEditModal order={editOrder} onClose={() => setEditOrder(null)} />
        )}
      </AnimatePresence>

      {/* Reset Confirm Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-8 max-w-sm w-full mx-4 shadow-warm"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-serif-tc font-bold text-xl text-foreground mb-3">確認歸零</h3>
              <p className="text-muted-foreground text-sm mb-1">將今日訂單封存歸檔，桌況清空歸零。</p>
              <p className="text-muted-foreground text-xs mb-6">封存的訂單仍可在營收報表中查看。</p>
              <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl text-base font-medium">取消</button>
                <button onClick={handleReset} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-base font-bold hover:opacity-90">確認歸零</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
