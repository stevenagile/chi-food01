import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingCartButtonProps {
  onClick: () => void;
}

const FloatingCartButton = ({ onClick }: FloatingCartButtonProps) => {
  const itemCount = useCartStore((s) => s.getItemCount());
  const total = useCartStore((s) => s.getTotal());

  if (itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        onClick={onClick}
        className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto z-40 flex items-center justify-between px-6 py-4 bg-gradient-red text-primary-foreground rounded-2xl shadow-warm"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-accent text-accent-foreground text-xs font-bold rounded-full">
              {itemCount}
            </span>
          </div>
          <span className="font-semibold">查看購物車</span>
        </div>
        <span className="text-lg font-bold font-serif-tc">${total}</span>
      </motion.button>
    </AnimatePresence>
  );
};

export default FloatingCartButton;
