import { create } from 'zustand';
import type { CartItem, MenuItem, Order } from '@/data/menu';

interface CartState {
  items: CartItem[];
  orderType: '內用' | '外帶';
  tableNumber: string;
  addItem: (item: MenuItem, quantity: number, options: Record<string, string>, note?: string) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: '內用' | '外帶') => void;
  setTableNumber: (table: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: '內用',
  tableNumber: '',

  addItem: (menuItem, quantity, selectedOptions, note) => {
    set((state) => ({
      items: [...state.items, { menuItem, quantity, selectedOptions, note }],
    }));
  },

  removeItem: (index) => {
    set((state) => ({
      items: state.items.filter((_, i) => i !== index),
    }));
  },

  updateQuantity: (index, quantity) => {
    set((state) => ({
      items: state.items.map((item, i) =>
        i === index ? { ...item, quantity: Math.max(1, quantity) } : item
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  setOrderType: (type) => set({ orderType: type }),
  setTableNumber: (table) => set({ tableNumber: table }),

  getTotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      let itemPrice = item.menuItem.price;
      // Add option price additions
      if (item.menuItem.options) {
        for (const opt of item.menuItem.options) {
          const selected = item.selectedOptions[opt.name];
          if (selected) {
            const choice = opt.choices.find((c) => c.label === selected);
            if (choice) itemPrice += choice.priceAdd;
          }
        }
      }
      return sum + itemPrice * item.quantity;
    }, 0);
  },

  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
