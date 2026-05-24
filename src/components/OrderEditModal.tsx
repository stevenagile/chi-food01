import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import type { Order, CartItem } from '@/data/menu';
import { useOrderStore } from '@/store/useOrderStore';
import { useToast } from '@/hooks/use-toast';

interface Props {
  order: Order;
  onClose: () => void;
}

const OrderEditModal = ({ order, onClose }: Props) => {
  const { updateOrderItems, archiveOrder } = useOrderStore();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>(
    order.items.map((item) => ({ ...item }))
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calcTotal = () =>
    items.reduce((sum, item) => {
      let price = item.menuItem.price;
      // Add option price additions
      if (item.menuItem.options && item.selectedOptions) {
        item.menuItem.options.forEach((opt) => {
          const selected = item.selectedOptions[opt.name];
          if (selected) {
            const choice = opt.choices.find((c) => c.label === selected);
            if (choice) price += choice.priceAdd;
          }
        });
      }
      return sum + price * item.quantity;
    }, 0);

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ title: '無法儲存', description: '訂單至少需要一個品項', variant: 'destructive' });
      return;
    }
    const newTotal = calcTotal();
    await updateOrderItems(order.id, items, newTotal);
    toast({ title: '已更新', description: `訂單已修改，金額 $${newTotal}` });
    onClose();
  };

  const handleDeleteOrder = async () => {
    await archiveOrder(order.id);
    toast({ title: '已刪除', description: `訂單 ${order.type}${order.tableNumber ? `·桌${order.tableNumber}` : ''} 已刪除`, variant: 'destructive' });
    setShowDeleteConfirm(false);
    onClose();
  };

  const newTotal = calcTotal();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl p-6 max-w-lg w-full mx-4 shadow-warm max-h-[80vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-tc font-bold text-xl text-foreground">
            修改訂單
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {order.type}{order.tableNumber ? ` · 桌${order.tableNumber}` : ''} · {new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
        </p>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {items.map((item, index) => {
            let unitPrice = item.menuItem.price;
            if (item.menuItem.options && item.selectedOptions) {
              item.menuItem.options.forEach((opt) => {
                const selected = item.selectedOptions[opt.name];
                if (selected) {
                  const choice = opt.choices.find((c) => c.label === selected);
                  if (choice) unitPrice += choice.priceAdd;
                }
              });
            }

            return (
              <div key={index} className="bg-background rounded-xl p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{item.menuItem.name}</p>
                    {Object.entries(item.selectedOptions).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Object.values(item.selectedOptions).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">${unitPrice}/份</p>
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQty(index, -1)}
                      className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center active:scale-95"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="text-lg font-bold w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQty(index, 1)}
                      className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center active:scale-95"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <span className="font-bold text-primary">${unitPrice * item.quantity}</span>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">已清空所有品項</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">
              原金額 <span className="line-through">${order.total}</span>
            </span>
            <span className="text-2xl font-serif-tc font-bold text-primary">${newTotal}</span>
          </div>
          <div className="flex gap-3 mb-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl text-base font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-base font-bold active:scale-95 transition-transform"
            >
              儲存修改
            </button>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={16} />
            整單刪除
          </button>
        </div>

        {/* Delete Confirm */}
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-2xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-xs w-full mx-4 shadow-warm border border-border"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={20} className="text-red-500" />
                <h4 className="font-serif-tc font-bold text-lg text-foreground">確認刪除訂單</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                確定要刪除這筆訂單嗎？此動作無法復原。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-xl text-sm font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:opacity-90"
                >
                  確認刪除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OrderEditModal;
