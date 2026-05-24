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
    // Get all recipe mappings with ingredient stock
    const { data, error } = await supabase
      .from('menu_item_ingredients')
      .select('menu_item_id, quantity, ingredient_id, ingredients(current_stock)');

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
      const ingRel = (row as { ingredients: { current_stock: number } | null }).ingredients;
      const stock = ingRel?.current_stock ?? 0;
      grouped[mid].push({ recipeQty: row.quantity, stock });
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
