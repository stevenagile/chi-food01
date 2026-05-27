import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, X, Store, Bike } from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';
import { useToast } from '@/hooks/use-toast';
import type { Order } from '@/data/menu';

type Method = '現金' | 'LinePay' | '信用卡' | '掃碼支付';
const METHODS: Method[] = ['現金', 'LinePay', '信用卡', '掃碼支付'];

const PendingPaymentPanel = () => {
  const { orders, updatePaymentStatus, updateOrderStatus } = useOrderStore();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<Order | null>(null);

  const unpaid = orders
    .filter((o) => o.paymentStatus === '未付款' && o.status === '待確認')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handlePay = async (order: Order, method: Method) => {
    await updatePaymentStatus(order.id, '已付款', method);
    await updateOrderStatus(order.id, order.type === '外帶' ? '已完成' : '製作中');
    toast({ title: '收款成功', description: `$${order.total} · ${method}` });
    setPicking(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative px-3 py-2 sm:px-4 sm:py-3 rounded-xl bg-orange-500 text-white font-bold flex items-center gap-2 text-sm sm:text-base hover:bg-orange-600 transition-colors"
        title="待收款列表"
      >
        <DollarSign size={18} />
        <span className="hidden sm:inline">待收款</span>
        {unpaid.length > 0 && (
          <span className="min-w-5 h-5 px-1 flex items-center justify-center bg-white text-orange-600 text-xs font-bold rounded-full">
            {unpaid.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex bg-black/40"
            onClick={() => {
              setOpen(false);
              setPicking(null);
            }}
          >
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto w-full sm:max-w-md h-full bg-card flex flex-col shadow-2xl"
            >
              <header className="px-4 py-3 bg-orange-500 text-white flex items-center gap-2">
                <DollarSign size={20} />
                <h2 className="font-bold text-lg">待收款 ({unpaid.length})</h2>
                <button
                  onClick={() => {
                    setOpen(false);
                    setPicking(null);
                  }}
                  className="ml-auto p-1 rounded-lg hover:bg-white/20"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {unpaid.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    目前沒有待收款訂單
                  </div>
                ) : (
                  unpaid.map((o) => (
                    <div
                      key={o.id}
                      className="border-2 border-border rounded-xl p-3 bg-background"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-bold">
                          {o.type === '內用' ? <Store size={16} /> : <Bike size={16} />}
                          {o.type === '內用' && o.tableNumber
                            ? `桌 ${o.tableNumber}`
                            : o.type}
                          {o.customerName === 'Foodpanda' && (
                            <span className="text-[10px] bg-pink-600 text-white px-1.5 py-0.5 rounded">
                              FP
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleTimeString('zh-TW', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="text-sm space-y-0.5 mb-2">
                        {o.items.map((it, i) => (
                          <div key={i} className="flex justify-between">
                            <span>
                              {it.menuItem.name} ×{it.quantity}
                            </span>
                            <span className="text-muted-foreground">
                              ${it.menuItem.price * it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2">
                        <span className="text-xl font-bold text-primary">${o.total}</span>
                        {picking?.id === o.id ? (
                          <div className="flex gap-1 flex-wrap justify-end">
                            {METHODS.map((m) => (
                              <button
                                key={m}
                                onClick={() => handlePay(o, m)}
                                className="px-2 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-bold"
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => setPicking(o)}
                            className="px-3 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm flex items-center gap-1"
                          >
                            <DollarSign size={14} /> 收款
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PendingPaymentPanel;
