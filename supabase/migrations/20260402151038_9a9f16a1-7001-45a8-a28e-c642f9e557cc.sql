
-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_deduct_ingredients ON public.orders;

-- Replace the function: deduct on INSERT, restore on cancel
CREATE OR REPLACE FUNCTION public.deduct_ingredients_on_order_complete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  menu_id text;
  qty int;
  mapping record;
BEGIN
  -- On INSERT: deduct ingredients
  IF TG_OP = 'INSERT' THEN
    FOR item IN SELECT jsonb_array_elements(NEW.items)
    LOOP
      menu_id := item->'menuItem'->>'id';
      qty := COALESCE((item->>'quantity')::int, 1);
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
    RETURN NEW;
  END IF;

  -- On UPDATE to '已取消': restore ingredients
  IF TG_OP = 'UPDATE' AND NEW.status = '已取消' AND OLD.status IS DISTINCT FROM '已取消' THEN
    FOR item IN SELECT jsonb_array_elements(NEW.items)
    LOOP
      menu_id := item->'menuItem'->>'id';
      qty := COALESCE((item->>'quantity')::int, 1);
      FOR mapping IN 
        SELECT ingredient_id, quantity AS recipe_qty
        FROM public.menu_item_ingredients
        WHERE menu_item_id = menu_id
      LOOP
        UPDATE public.ingredients
        SET current_stock = current_stock + (mapping.recipe_qty * qty)
        WHERE id = mapping.ingredient_id;
      END LOOP;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER trg_deduct_ingredients
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_ingredients_on_order_complete();

-- Function to check if all items have enough stock
CREATE OR REPLACE FUNCTION public.check_ingredient_availability(p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item jsonb;
  menu_id text;
  qty int;
  mapping record;
  avail numeric;
  min_servings numeric := 999999;
  item_name text;
  unavailable_items jsonb := '[]'::jsonb;
BEGIN
  FOR item IN SELECT jsonb_array_elements(p_items)
  LOOP
    menu_id := item->'menuItem'->>'id';
    item_name := item->'menuItem'->>'name';
    qty := COALESCE((item->>'quantity')::int, 1);
    
    FOR mapping IN 
      SELECT mi.ingredient_id, mi.quantity AS recipe_qty, i.current_stock, i.name AS ing_name
      FROM public.menu_item_ingredients mi
      JOIN public.ingredients i ON i.id = mi.ingredient_id
      WHERE mi.menu_item_id = menu_id
    LOOP
      IF mapping.recipe_qty > 0 THEN
        avail := floor(mapping.current_stock / mapping.recipe_qty);
        IF avail < qty THEN
          unavailable_items := unavailable_items || jsonb_build_object(
            'item', item_name,
            'ingredient', mapping.ing_name,
            'available', avail,
            'requested', qty
          );
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'available', jsonb_array_length(unavailable_items) = 0,
    'unavailable_items', unavailable_items
  );
END;
$function$;
