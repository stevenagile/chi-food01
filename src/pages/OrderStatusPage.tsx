import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderStore } from '@/store/useOrderStore';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ChefHat, ArrowLeft } from 'lucide-react';

const statusConfig = {
  '待確認': { icon: Clock, color: 'text-accent', label: '等待店家確認' },
  '製作中': { icon: ChefHat, color: 'text-primary', label: '廚房製作中' },
  '已完成': { icon: CheckCircle2, color: 'text-green-600', label: '已完成，請取餐' },
  '已取消': { icon: Clock, color: 'text-destructive', label: '訂單已取消' },
};

const OrderStatusPage = () => {
  const { orderId } = useParams();
  const { fetchOrders, subscribeToOrders } = useOrderStore();
  const order = useOrderStore((s) => s.orders.find((o) => o.id === orderId));

  useEffect(() => {
    fetchOrders();
    const unsubscribe = subscribeToOrders();
    return unsubscribe;
  }, []);

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">找不到此訂單</p>
          <Link to="/menu" className="text-primary underline">回到菜單</Link>
        </div>
      </div>
    );
  }

  const { icon: StatusIcon, color, label } = statusConfig[order.status];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-6">
        <Link to="/menu" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={18} />
          繼續點餐
        </Link>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl border border-border p-6 shadow-warm"
        >
          <div className="text-center mb-6">
            <StatusIcon size={48} className={`mx-auto mb-3 ${color}`} />
            <h1 className="text-xl font-serif-tc font-bold text-foreground">{label}</h1>
            <p className="text-sm text-muted-foreground mt-1">訂單編號：{order.id}</p>
            <p className="text-sm text-muted-foreground">
              {order.type} {order.tableNumber ? `· 桌號 ${order.tableNumber}` : ''}
            </p>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span className="text-foreground">{item.menuItem.name}</span>
                  <span className="text-muted-foreground"> x{item.quantity}</span>
                  {Object.entries(item.selectedOptions).map(([k, v]) => (
                    <span key={k} className="text-muted-foreground text-xs block ml-2">
                      {k}：{v}
                    </span>
                  ))}
                </div>
                <span className="text-foreground font-medium">${item.menuItem.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
            <span className="font-semibold text-foreground">合計</span>
            <span className="text-2xl font-serif-tc font-bold text-primary">${order.total}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderStatusPage;
