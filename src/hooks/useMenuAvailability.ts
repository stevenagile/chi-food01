import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { menuItems } from '@/data/menu';

export interface MenuAvailability {
  [menuItemId: string]: number; // available servings
}

export const useMenuAvailability = () => {
  const [availability, setAvailability] = useState<MenuAvailability>({});
  const [loading, setLoading] = useState(true);

  const fetchAvailability = async () => {
    // Public-safe RPC: returns only menu_item_id + recipe_qty + current_stock
    const { data, error } = await supabase.rpc('get_menu_availability');

    if (error || !data) {
      setLoading(false);
      return;
    }

    const result: MenuAvailability = {};

    // Group by menu_item_id
    const grouped: Record<string, { recipeQty: number; stock: number }[]> = {};
    for (const row of data) {
      const mid = row.menu_item_id;
      if (!grouped[mid]) grouped[mid] = [];
      grouped[mid].push({ recipeQty: Number(row.recipe_qty), stock: Number(row.current_stock) });
    }

    // For items with recipes, calc min servings
    for (const [mid, mappings] of Object.entries(grouped)) {
      const servings = Math.min(
        ...mappings.map((m) =>
          m.recipeQty > 0 ? Math.floor(m.stock / m.recipeQty) : Infinity
        )
      );
      result[mid] = servings;
    }

    // Items without recipes are considered unlimited
    for (const item of menuItems) {
      if (!(item.id in result)) {
        result[item.id] = Infinity;
      }
    }

    setAvailability(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchAvailability();

    // Subscribe to ingredient stock changes
    const channel = supabase
      .channel('ingredients-availability')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        () => fetchAvailability()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchAvailability()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { availability, loading, isSoldOut: (id: string) => (availability[id] ?? Infinity) <= 0 };
};
