
-- 1. 更新扣減函式：只處理「今日（台北時區）」建立的訂單
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
  v_today date := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_order_date date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_order_date := (NEW.created_at AT TIME ZONE 'Asia/Taipei')::date;
    IF v_order_date <> v_today THEN
      RETURN NEW;
    END IF;
    IF NEW.status = '已取消' THEN
      RETURN NEW;
    END IF;
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

  IF TG_OP = 'UPDATE' THEN
    v_order_date := (NEW.created_at AT TIME ZONE 'Asia/Taipei')::date;
    IF v_order_date <> v_today THEN
      RETURN NEW;
    END IF;
    -- 從非取消 -> 取消：還原
    IF NEW.status = '已取消' AND OLD.status IS DISTINCT FROM '已取消' THEN
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
    -- 從取消 -> 非取消：重新扣減
    IF OLD.status = '已取消' AND NEW.status IS DISTINCT FROM '已取消' THEN
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
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. 掛上觸發器（INSERT 與 status 變動時）
DROP TRIGGER IF EXISTS trg_deduct_ingredients_insert ON public.orders;
DROP TRIGGER IF EXISTS trg_deduct_ingredients_update ON public.orders;

CREATE TRIGGER trg_deduct_ingredients_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_ingredients_on_order_complete();

CREATE TRIGGER trg_deduct_ingredients_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.deduct_ingredients_on_order_complete();

-- 3. 同步更新可出份數檢查函式：只考慮今日訂單對庫存的佔用（current_stock 本身已是今日剩餘）
-- check_ingredient_availability 直接讀取 current_stock，因 close_daily_stats 每日重置，邏輯天然只看今日，無需更動。
