import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MenuItem } from '@/data/menu';
import { useCartStore } from '@/store/useCartStore';
import { Minus, Plus, X } from 'lucide-react';

interface ItemDetailSheetProps {
  item: MenuItem | null;
  onClose: () => void;
}

const ItemDetailSheet = ({ item, onClose }: ItemDetailSheetProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const addItem = useCartStore((s) => s.addItem);

  if (!item) return null;

  // Initialize defaults
  const getDefaults = () => {
    const defaults: Record<string, string> = {};
    item.options?.forEach((opt) => {
      if (opt.choices.length > 0) {
        defaults[opt.name] = opt.choices[0].label;
      }
    });
    return defaults;
  };

  const options = Object.keys(selectedOptions).length > 0 ? selectedOptions : getDefaults();

  const calcPrice = () => {
    let total = item.price;
    item.options?.forEach((opt) => {
      const sel = options[opt.name];
      if (sel) {
        const choice = opt.choices.find((c) => c.label === sel);
        if (choice) total += choice.priceAdd;
      }
    });
    return total * quantity;
  };

  const handleAdd = () => {
    addItem(item, quantity, options, note || undefined);
    setQuantity(1);
    setSelectedOptions({});
    setNote('');
    onClose();
  };

  return (
    <AnimatePresence>
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
          className="w-full max-w-lg bg-background rounded-t-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Image preview */}
            {item.image && (
              <div className="w-full aspect-[16/9] overflow-hidden bg-muted">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="p-6 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif-tc font-bold text-foreground">{item.name}</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {item.description && (
                <p className="text-muted-foreground mb-4">{item.description}</p>
              )}

            {/* Options */}
            {item.options?.map((opt) => (
              <div key={opt.name} className="mb-4">
                <h3 className="font-semibold text-foreground mb-2">{opt.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {opt.choices.map((choice) => (
                    <button
                      key={choice.label}
                      onClick={() =>
                        setSelectedOptions((prev) => ({ ...prev, [opt.name]: choice.label }))
                      }
                      className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                        (options[opt.name] || opt.choices[0].label) === choice.label
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {choice.label}
                      {choice.priceAdd > 0 && ` +$${choice.priceAdd}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Note */}
            <div className="mb-4">
              <h3 className="font-semibold text-foreground mb-2">備註</h3>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="例如：少鹽、加辣..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            </div>
          </div>

          {/* Sticky bottom action */}
          <div className="sticky bottom-0 bg-background border-t border-border p-4 flex items-center gap-4">
            <div className="flex items-center gap-3 bg-muted rounded-full px-2 py-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors"
              >
                <Minus size={16} className="text-foreground" />
              </button>
              <span className="w-6 text-center font-semibold text-foreground">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background transition-colors"
              >
                <Plus size={16} className="text-foreground" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 py-3 bg-gradient-red text-primary-foreground font-semibold rounded-full text-center hover:opacity-90 transition-opacity shadow-warm"
            >
              加入購物車 · ${calcPrice()}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ItemDetailSheet;
