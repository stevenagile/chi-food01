import { motion } from 'framer-motion';
import type { MenuItem } from '@/data/menu';
import { Plus } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
  soldOut?: boolean;
}

const MenuItemCard = ({ item, onAdd, soldOut = false }: MenuItemCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl bg-card shadow-warm border border-border/50 transition-colors ${
        soldOut ? 'opacity-60' : 'hover:border-primary/20'
      }`}
    >
      {item.image && (
        <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted relative">
          <img
            src={item.image}
            alt={item.name}
            className={`w-full h-full object-cover ${soldOut ? 'grayscale' : ''}`}
            loading="lazy"
          />
          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-lg">
              <span className="text-xs font-bold text-white bg-destructive px-2 py-0.5 rounded-full">
                售完
              </span>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-serif-tc font-semibold text-foreground text-base truncate">
            {item.name}
          </h3>
          {soldOut && !item.image && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full">
              售完
            </span>
          )}
          {!soldOut && item.popular && (
            <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-gradient-gold text-gold-foreground rounded-full">
              人氣
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
            {item.description}
          </p>
        )}
        <p className="mt-1 text-lg font-bold text-primary font-serif-tc">
          ${item.price}
        </p>
      </div>
      {soldOut ? (
        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground cursor-not-allowed">
          <Plus size={20} />
        </div>
      ) : (
        <button
          onClick={() => onAdd(item)}
          className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm"
        >
          <Plus size={20} />
        </button>
      )}
    </motion.div>
  );
};

export default MenuItemCard;
