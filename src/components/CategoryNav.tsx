import { motion } from 'framer-motion';
import { categories } from '@/data/menu';

interface CategoryNavProps {
  activeCategory: string;
  onSelect: (id: string) => void;
}

const CategoryNav = ({ activeCategory, onSelect }: CategoryNavProps) => {
  return (
    <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="flex overflow-x-auto gap-1 px-4 py-3 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {activeCategory === cat.id && (
              <motion.div
                layoutId="activeCategory"
                className="absolute inset-0 bg-gradient-red rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">{cat.icon}</span>
            <span className="relative z-10">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryNav;
