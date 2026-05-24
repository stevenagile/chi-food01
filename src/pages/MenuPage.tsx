import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { menuItems, categories } from '@/data/menu';
import type { MenuItem } from '@/data/menu';
import CategoryNav from '@/components/CategoryNav';
import MenuItemCard from '@/components/MenuItemCard';
import ItemDetailSheet from '@/components/ItemDetailSheet';
import CartDrawer from '@/components/CartDrawer';
import FloatingCartButton from '@/components/FloatingCartButton';
import { useCartStore } from '@/store/useCartStore';
import { useMenuAvailability } from '@/hooks/useMenuAvailability';
import { motion } from 'framer-motion';

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const setOrderType = useCartStore((s) => s.setOrderType);
  const setTableNumber = useCartStore((s) => s.setTableNumber);
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const { isSoldOut } = useMenuAvailability();

  useEffect(() => {
    const table = searchParams.get('table');
    if (table) {
      setOrderType('內用');
      setTableNumber(table);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredByCategory = (catId: string) =>
    menuItems.filter((item) => item.category === catId);

  const handleItemClick = (item: MenuItem) => {
    if (!isSoldOut(item.id)) {
      setSelectedItem(item);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-dark-wood text-dark-wood-foreground px-6 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto"
        >
          <h1 className="text-2xl font-serif-tc font-bold text-gold">
            虎秋文昌雞
          </h1>
          <p className="text-sm mt-1 opacity-80">
            正宗港式燒味 · 即叫即切
          </p>
        </motion.div>
      </div>

      <div className="max-w-lg mx-auto">
        <CategoryNav activeCategory={activeCategory} onSelect={scrollToCategory} />

        <div className="px-4 py-4 space-y-8">
          {categories.map((cat) => {
            const items = filteredByCategory(cat.id);
            if (items.length === 0) return null;
            return (
              <div
                key={cat.id}
                ref={(el) => { sectionRefs.current[cat.id] = el; }}
              >
                <h2 className="font-serif-tc font-bold text-lg text-foreground mb-3 flex items-center gap-2">
                  <span>{cat.icon}</span>
                  {cat.name}
                </h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAdd={handleItemClick}
                      soldOut={isSoldOut(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ItemDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <FloatingCartButton onClick={() => setCartOpen(true)} />
    </div>
  );
};

export default MenuPage;
