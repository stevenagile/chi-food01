-- 1. ORDERS: remove anon SELECT, tighten anon INSERT
DROP POLICY IF EXISTS anon_select_orders ON public.orders;
DROP POLICY IF EXISTS anon_insert_orders ON public.orders;

CREATE POLICY anon_insert_orders ON public.orders
  FOR INSERT TO anon
  WITH CHECK (
    is_archived = false
    AND status = '待確認'
    AND payment_status = '未付款'
    AND paid_at IS NULL
    AND cooking_at IS NULL
    AND completed_at IS NULL
  );

-- Public-safe RPC: customer queries own order by id (no name/phone)
CREATE OR REPLACE FUNCTION public.get_order_status(p_id text)
RETURNS TABLE (
  id text,
  type text,
  table_number text,
  items jsonb,
  total numeric,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.type, o.table_number, o.items, o.total, o.status, o.created_at
  FROM public.orders o
  WHERE o.id = p_id;
$$;

REVOKE ALL ON FUNCTION public.get_order_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_status(text) TO anon, authenticated;

-- 2. INGREDIENTS / MENU_ITEM_INGREDIENTS: remove anon SELECT
DROP POLICY IF EXISTS anon_select_ingredients ON public.ingredients;
DROP POLICY IF EXISTS anon_select_menu_item_ingredients ON public.menu_item_ingredients;

-- Public-safe RPC: returns only what's needed to compute availability
CREATE OR REPLACE FUNCTION public.get_menu_availability()
RETURNS TABLE (menu_item_id text, recipe_qty numeric, current_stock numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT mi.menu_item_id, mi.quantity AS recipe_qty, i.current_stock
  FROM public.menu_item_ingredients mi
  JOIN public.ingredients i ON i.id = mi.ingredient_id;
$$;

REVOKE ALL ON FUNCTION public.get_menu_availability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_menu_availability() TO anon, authenticated;

-- 3. USER_ROLES: restrict writes to admin only (close privilege-escalation hole)
CREATE POLICY user_roles_admin_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Add admin guards inside privileged SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.archive_all_orders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_stats JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  v_stats := public.close_daily_stats();
  UPDATE public.orders SET is_archived = true WHERE is_archived = false;
  RETURN v_stats;
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_daily_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_revenue NUMERIC;
  v_count   INTEGER;
  v_date    DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;

  SELECT COALESCE(SUM(total), 0), COUNT(*)
    INTO v_revenue, v_count
  FROM public.orders
  WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = v_date
    AND is_archived = false
    AND status <> '已取消';

  INSERT INTO public.daily_history (stat_date, revenue_amount, servings_count)
  VALUES (v_date, v_revenue, v_count)
  ON CONFLICT (stat_date) DO UPDATE
  SET revenue_amount = EXCLUDED.revenue_amount,
      servings_count = EXCLUDED.servings_count;

  UPDATE public.orders SET is_archived = true
  WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = v_date
    AND is_archived = false;

  RETURN jsonb_build_object('date', v_date, 'revenue', v_revenue, 'count', v_count);
END;
$function$;

-- 5. Revoke EXECUTE on SECURITY DEFINER functions that shouldn't be public-callable
REVOKE ALL ON FUNCTION public.has_role(uuid, text) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.archive_all_orders() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_all_orders() TO authenticated;
REVOKE ALL ON FUNCTION public.close_daily_stats() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_daily_stats() TO authenticated;
REVOKE ALL ON FUNCTION public.check_ingredient_availability(jsonb) FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.deduct_ingredients_on_order_complete() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;