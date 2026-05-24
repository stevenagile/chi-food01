import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/useCartStore';
import { useOrderStore } from '@/store/useOrderStore';
import { Minus, Plus, Trash2, X, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const {
    items,
    orderType,
    tableNumber,
    removeItem,
    updateQuantity,
    clearCart,
    setOrderType,
    setTableNumber,
    getTotal,
  } = useCartStore();
  const addOrder = useOrderStore((s) => s.addOrder);
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const handleSubmit = () => {
    // 桌號為選填

    if (items.length === 0) {
      toast.error('購物車是空的');
      return;
    }

    const order = {
      id: `ORD-${Date.now()}`,
      tableNumber: orderType === '內用' ? tableNumber : undefined,
      type: orderType,
      items: [...items],
      total: getTotal(),
      status: '待確認' as const,
      createdAt: new Date(),
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      paymentStatus: '未付款' as const,
      paymentMethod: null,
      paidAt: null,
    };

    addOrder(order);
    clearCart();
    onClose();
    toast.success('訂單已送出！', { description: `訂單編號：${order.id}` });
    navigate(`/order-status/${order.id}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/40 flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            className="w-full max-w-lg bg-background rounded-t-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-background z-10 p-6 pb-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif-tc font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag size={22} className="text-primary" />
                  購物車
                </h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {/* Order type */}
              <div className="flex gap-2 mt-4">
                {(['內用', '外帶'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-colors ${
                      orderType === type
                        ? 'bg-gradient-red text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {orderType === '內用' && (
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="請輸入桌號"
                  className="mt-3 w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}

              {orderType === '外帶' && (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="姓名（選填）"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="電話（選填）"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>

            {/* Items */}
            <div className="p-6 space-y-3">
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">購物車是空的</p>
              ) : (
                items.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{item.menuItem.name}</p>
                      {Object.entries(item.selectedOptions).map(([key, val]) => (
                        <p key={key} className="text-xs text-muted-foreground">{key}：{val}</p>
                      ))}
                      {item.note && <p className="text-xs text-muted-foreground">備註：{item.note}</p>}
                      <p className="text-sm font-semibold text-primary mt-1">${item.menuItem.price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-muted rounded-full px-1 py-0.5">
                        <button
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-background"
                        >
                          <Minus size={14} className="text-foreground" />
                        </button>
                        <span className="w-5 text-center text-sm font-medium text-foreground">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-background"
                        >
                          <Plus size={14} className="text-foreground" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1.5 rounded-full hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="sticky bottom-0 bg-background border-t border-border p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground">合計</span>
                  <span className="text-2xl font-serif-tc font-bold text-primary">${getTotal()}</span>
                </div>
                <button
                  onClick={handleSubmit}
                  className="w-full py-4 bg-gradient-red text-primary-foreground font-bold text-lg rounded-full hover:opacity-90 transition-opacity shadow-warm"
                >
                  送出訂單
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
