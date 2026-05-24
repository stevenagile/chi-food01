
-- Menu item to ingredient mapping (recipe/BOM)
CREATE TABLE public.menu_item_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id text NOT NULL,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read menu_item_ingredients" ON public.menu_item_ingredients FOR SELECT TO public USING (true);
CREATE POLICY "Public insert menu_item_ingredients" ON public.menu_item_ingredients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update menu_item_ingredients" ON public.menu_item_ingredients FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete menu_item_ingredients" ON public.menu_item_ingredients FOR DELETE TO public USING (true);

-- Function to deduct ingredients when order completes
CREATE OR REPLACE FUNCTION public.deduct_ingredients_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item jsonb;
  menu_id text;
  qty int;
  mapping record;
BEGIN
  -- Only fire when status changes to '已完成'
  IF NEW.status = '已完成' AND (OLD.status IS DISTINCT FROM '已完成') THEN
    -- Loop through order items
    FOR item IN SELECT jsonb_array_elements(NEW.items)
    LOOP
      menu_id := item->'menuItem'->>'id';
      qty := COALESCE((item->>'quantity')::int, 1);
      
      -- Deduct each mapped ingredient
      FOR mapping IN 
        SELECT ingredient_id, quantity AS recipe_qty
        FROM public.menu_item_ingredients
        WHERE menu_item_id = menu_id
      LOOP
        UPDATE public.ingredients
        SET current_stock = current_stock - (mapping.recipe_qty * qty)
        WHERE id = mapping.ingredient_id;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on orders table
CREATE TRIGGER trg_deduct_ingredients_on_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_ingredients_on_order_complete();
