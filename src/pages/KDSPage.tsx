import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, CheckCircle2, Store, Bike, Clock } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import { useOrderStore } from '@/store/useOrderStore';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/data/menu';

const elapsed = (d: Date) => {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return '剛剛';
  if (m < 60) return `${m} 分`;
  return `${Math.floor(m / 60)} 時 ${m % 60} 分`;
};

const KDSPage = () => {
  const { orders, fetchOrders, subscribeToOrders, updateOrderStatus } = useOrderStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
    const unsub = subscribeToOrders();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // KDS 只關心「已付款且尚未完成」的訂單
  const queue = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            o.paymentStatus === '已付款' &&
            (o.status === '待確認' || o.status === '製作中'),
        )
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [orders],
  );

  const pending = queue.filter((o) => o.status === '待確認');
  const cooking = queue.filter((o) => o.status === '製作中');

  const handleStart = async (o: Order) => {
    await updateOrderStatus(o.id, '製作中');
  };
  const handleDone = async (o: Order) => {
    await updateOrderStatus(o.id, '已完成');
    toast({ title: '出餐完成', description: `${o.type} ${o.tableNumber ? `· 桌${o.tableNumber}` : ''}` });
  };

  const Card = ({ order, action }: { order: Order; action: 'start' | 'done' }) => {
    const min = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    const urgent = min >= 10;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`rounded-2xl border-4 bg-card shadow-warm p-4 flex flex-col ${
          urgent ? 'border-red-500' : 'border-border'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {order.type === '內用' ? <Store size={22} /> : <Bike size={22} />}
            <span className="text-2xl font-bold text-foreground">
              {order.type === '內用' && order.tableNumber
                ? `桌 ${order.tableNumber}`
                : order.type}
            </span>
          </div>
          <span
            className={`flex items-center gap-1 text-base font-bold px-2 py-1 rounded-lg ${
              urgent ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Clock size={16} /> {elapsed(order.createdAt)}
          </span>
        </div>
        {order.customerName === 'Foodpanda' && (
          <span className="self-start text-xs font-bold bg-pink-600 text-white px-2 py-0.5 rounded mb-2">
            Foodpanda
          </span>
        )}
        <div className="flex-1 space-y-1 mb-3">
          {order.items.map((it, i) => (
            <div key={i} className="text-xl text-foreground">
              <span className="font-bold text-primary mr-2">×{it.quantity}</span>
              {it.menuItem.name}
              {it.selectedOptions && Object.keys(it.selectedOptions).length > 0 && (
                <span className="block text-sm text-muted-foreground ml-7">
                  {Object.entries(it.selectedOptions)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(' / ')}
                </span>
              )}
            </div>
          ))}
        </div>
        {action === 'start' ? (
          <button
            onClick={() => handleStart(order)}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center gap-2"
          >
            <ChefHat size={22} /> 開始製作
          </button>
        ) : (
          <button
            onClick={() => handleDone(order)}
            className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-xl flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={22} /> 出餐完成
          </button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">
          出餐 KDS
        </h1>
        <AdminNav />
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* 待製作 */}
        <section className="flex flex-col bg-orange-50 border-2 border-orange-200 rounded-2xl overflow-hidden">
          <header className="bg-orange-500 text-white px-4 py-3 flex items-center gap-2">
            <ChefHat size={20} />
            <h2 className="font-bold text-lg">待製作</h2>
            <span className="ml-auto bg-white/20 px-3 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto p-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] content-start">
            <AnimatePresence>
              {pending.map((o) => (
                <Card key={o.id} order={o} action="start" />
              ))}
            </AnimatePresence>
            {pending.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">
                目前沒有待製作訂單
              </div>
            )}
          </div>
        </section>

        {/* 製作中 */}
        <section className="flex flex-col bg-primary/5 border-2 border-primary/30 rounded-2xl overflow-hidden">
          <header className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-2">
            <ChefHat size={20} />
            <h2 className="font-bold text-lg">製作中</h2>
            <span className="ml-auto bg-white/20 px-3 py-0.5 rounded-full font-bold">
              {cooking.length}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto p-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] content-start">
            <AnimatePresence>
              {cooking.map((o) => (
                <Card key={o.id} order={o} action="done" />
              ))}
            </AnimatePresence>
            {cooking.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground py-12">
                沒有正在製作的訂單
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default KDSPage;
