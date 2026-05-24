import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Minus, Trash2, Check, Bike, Store, ShoppingBag } from 'lucide-react';
import AdminNav from '@/components/AdminNav';
import { menuItems, categories } from '@/data/menu';
import type { MenuItem, CartItem } from '@/data/menu';
import { useOrderStore } from '@/store/useOrderStore';
import { useMenuAvailability } from '@/hooks/useMenuAvailability';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type Mode = 'internal' | 'foodpanda';

const POSPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addOrder } = useOrderStore();
  const { availability, isSoldOut } = useMenuAvailability();

  const [mode, setMode] = useState<Mode>('internal');
  const [activeCat, setActiveCat] = useState(categories[0].id);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'內用' | '外帶'>('內用');
  const [tableNumber, setTableNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const filtered = useMemo(
    () => menuItems.filter((m) => m.category === activeCat),
    [activeCat]
  );

  const calcItemPrice = (item: CartItem) => {
    let p = item.menuItem.price;
    if (item.menuItem.options) {
      for (const opt of item.menuItem.options) {
        const sel = item.selectedOptions[opt.name];
        const choice = opt.choices.find((c) => c.label === sel);
        if (choice) p += choice.priceAdd;
      }
    }
    return p;
  };

  const total = cart.reduce((s, it) => s + calcItemPrice(it) * it.quantity, 0);
  const itemCount = cart.reduce((s, it) => s + it.quantity, 0);

  const addToCart = (item: MenuItem) => {
    if (isSoldOut(item.id)) return;
    // For options, default to first choice
    const selectedOptions: Record<string, string> = {};
    if (item.options) {
      for (const opt of item.options) {
        selectedOptions[opt.name] = opt.choices[0].label;
      }
    }
    setCart((prev) => {
      const idx = prev.findIndex(
        (p) =>
          p.menuItem.id === item.id &&
          JSON.stringify(p.selectedOptions) === JSON.stringify(selectedOptions)
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { menuItem: item, quantity: 1, selectedOptions }];
    });
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((it, i) => (i === idx ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  };

  const cycleOption = (idx: number, optName: string) => {
    setCart((prev) => {
      const next = [...prev];
      const it = next[idx];
      const opt = it.menuItem.options?.find((o) => o.name === optName);
      if (!opt) return prev;
      const cur = it.selectedOptions[optName];
      const ci = opt.choices.findIndex((c) => c.label === cur);
      const nextChoice = opt.choices[(ci + 1) % opt.choices.length];
      next[idx] = {
        ...it,
        selectedOptions: { ...it.selectedOptions, [optName]: nextChoice.label },
      };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (mode === 'internal' && orderType === '內用' && !tableNumber.trim()) {
      toast({ title: '請輸入桌號', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    const id = `${mode === 'foodpanda' ? 'FP' : 'IN'}${Date.now()}`;
    await addOrder({
      id,
      type: mode === 'foodpanda' ? '外帶' : orderType,
      tableNumber: mode === 'internal' && orderType === '內用' ? tableNumber : undefined,
      items: cart,
      total,
      status: '待確認',
      createdAt: new Date(),
      customerName: mode === 'foodpanda' ? 'Foodpanda' : undefined,
      paymentStatus: mode === 'foodpanda' ? '已付款' : '未付款',
      paymentMethod: mode === 'foodpanda' ? '掃碼支付' : null,
    });
    toast({ title: '送單成功', description: `${mode === 'foodpanda' ? 'Foodpanda' : '內部'} · $${total}` });

    // 檢查低於安全庫存的食材（DB 觸發器已自動扣減）
    try {
      const menuIds = cart.map((c) => c.menuItem.id);
      const { data: maps } = await supabase
        .from('menu_item_ingredients')
        .select('ingredient_id')
        .in('menu_item_id', menuIds);
      const ingIds = Array.from(new Set((maps ?? []).map((m: any) => m.ingredient_id)));
      if (ingIds.length > 0) {
        const { data: ings } = await supabase
          .from('ingredients')
          .select('name, current_stock, min_stock, unit')
          .in('id', ingIds);
        const low = (ings ?? []).filter(
          (i: any) => Number(i.min_stock) > 0 && Number(i.current_stock) <= Number(i.min_stock)
        );
        if (low.length > 0) {
          toast({
            title: '⚠️ 庫存不足提醒',
            description: low
              .map((i: any) => `${i.name}：剩 ${i.current_stock}${i.unit}（安全量 ${i.min_stock}）`)
              .join('\n'),
            variant: 'destructive',
          });
        }
      }
    } catch (e) {
      console.error('Low stock check failed:', e);
    }

    setCart([]);
    setTableNumber('');
    setSubmitting(false);
  };

  const accent = mode === 'foodpanda' ? 'bg-pink-600' : 'bg-primary';
  const accentText = mode === 'foodpanda' ? 'text-pink-600' : 'text-primary';

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-dark-wood text-dark-wood-foreground px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-lg font-serif-tc font-bold text-gold whitespace-nowrap w-[160px] shrink-0">POS</h1>
        <AdminNav />
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setMode('internal')}
            className={`px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-bold flex items-center gap-2 text-sm sm:text-base transition-all ${
              mode === 'internal' ? 'bg-gold text-dark-wood' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Store size={18} /> <span className="hidden sm:inline">內部</span>
          </button>
          <button
            onClick={() => setMode('foodpanda')}
            className={`px-3 py-2 sm:px-5 sm:py-3 rounded-xl font-bold flex items-center gap-2 text-sm sm:text-base transition-all ${
              mode === 'foodpanda' ? 'bg-pink-500 text-white' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            <Bike size={18} /> <span className="hidden sm:inline">Foodpanda</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: menu */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Categories */}
          <div className="flex gap-2 p-3 overflow-x-auto bg-card border-b border-border">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`px-5 py-3 rounded-xl font-bold whitespace-nowrap text-base transition-all ${
                  activeCat === c.id
                    ? `${accent} text-white shadow-warm`
                    : 'bg-muted text-foreground hover:bg-muted/70'
                }`}
              >
                <span className="mr-1.5">{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((item) => {
                const stock = availability[item.id];
                const sold = isSoldOut(item.id);
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.96 }}
                    disabled={sold}
                    onClick={() => addToCart(item)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                      sold
                        ? 'bg-muted border-border opacity-50 cursor-not-allowed'
                        : 'bg-card border-border hover:border-primary shadow-warm'
                    }`}
                  >
                    <div className="font-serif-tc font-bold text-base text-foreground leading-tight">
                      {item.name}
                    </div>
                    <div className={`mt-2 font-bold text-lg ${accentText}`}>
                      ${item.price}
                      {item.options && <span className="text-xs text-muted-foreground ml-1">起</span>}
                    </div>
                    {sold ? (
                      <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 bg-destructive text-destructive-foreground rounded font-bold">
                        售完
                      </span>
                    ) : stock !== undefined && stock !== Infinity && stock <= 5 ? (
                      <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                        剩{stock}
                      </span>
                    ) : null}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: cart */}
        <div className="w-[380px] flex flex-col bg-card border-l border-border">
          {/* Mode/Type Header */}
          <div className={`px-4 py-3 ${accent} text-white`}>
            <div className="flex items-center gap-2 mb-2">
              {mode === 'foodpanda' ? <Bike size={20} /> : <Store size={20} />}
              <span className="font-bold text-base">
                {mode === 'foodpanda' ? 'Foodpanda 訂單' : '內部代點'}
              </span>
            </div>
            {mode === 'internal' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderType('內用')}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm ${
                    orderType === '內用' ? 'bg-white text-primary' : 'bg-white/20'
                  }`}
                >
                  內用
                </button>
                <button
                  onClick={() => setOrderType('外帶')}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm ${
                    orderType === '外帶' ? 'bg-white text-primary' : 'bg-white/20'
                  }`}
                >
                  外帶
                </button>
                {orderType === '內用' && (
                  <input
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="桌號"
                    className="w-20 px-2 rounded-lg text-foreground font-bold text-center"
                  />
                )}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">尚未選擇品項</div>
            ) : (
              cart.map((it, idx) => (
                <div key={idx} className="bg-background rounded-xl p-3 border border-border">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-bold text-foreground">{it.menuItem.name}</div>
                    <button
                      onClick={() => updateQty(idx, -it.quantity)}
                      className="text-destructive p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {it.menuItem.options?.map((opt) => (
                    <button
                      key={opt.name}
                      onClick={() => cycleOption(idx, opt.name)}
                      className="text-xs px-2 py-1 mr-1 mb-1 bg-muted rounded-md hover:bg-muted/70"
                    >
                      {opt.name}: {it.selectedOptions[opt.name]}
                    </button>
                  ))}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold text-base w-6 text-center">{it.quantity}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <span className={`font-bold ${accentText}`}>
                      ${calcItemPrice(it) * it.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{itemCount} 件</span>
              <span className={`text-2xl font-bold ${accentText}`}>${total}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting}
              className={`w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-40 ${accent}`}
            >
              <Check size={20} />
              {submitting ? '送單中...' : '送單'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPage;
