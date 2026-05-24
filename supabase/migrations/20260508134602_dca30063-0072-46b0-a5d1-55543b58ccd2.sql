-- Daily history stats table
CREATE TABLE public.daily_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  prep_amount NUMERIC NOT NULL DEFAULT 0,
  servings_count INTEGER NOT NULL DEFAULT 0,
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read daily_history" ON public.daily_history FOR SELECT USING (true);
CREATE POLICY "Public insert daily_history" ON public.daily_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update daily_history" ON public.daily_history FOR UPDATE USING (true);

-- Daily close: snapshot stats + reset ingredient stock
CREATE OR REPLACE FUNCTION public.close_daily_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_prep NUMERIC := 0;
  v_servings INTEGER := 0;
  v_revenue NUMERIC := 0;
  v_order RECORD;
  v_item jsonb;
BEGIN
  -- 1. 今日備料金額 = 今日採購總金額 (purchase_records)
  SELECT COALESCE(SUM(total_price), 0)
  INTO v_prep
  FROM public.purchase_records
  WHERE purchase_date = v_date;

  -- 2. 出餐份數 = 今日所有非取消訂單的品項總份數
  FOR v_order IN
    SELECT items FROM public.orders
    WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = v_date
      AND status <> '已取消'
  LOOP
    FOR v_item IN SELECT jsonb_array_elements(v_order.items)
    LOOP
      v_servings := v_servings + COALESCE((v_item->>'quantity')::int, 1);
    END LOOP;
  END LOOP;

  -- 3. 收款金額 = 今日已付款訂單總額
  SELECT COALESCE(SUM(total), 0)
  INTO v_revenue
  FROM public.orders
  WHERE (created_at AT TIME ZONE 'Asia/Taipei')::date = v_date
    AND payment_status = '已付款';

  -- 寫入歷史統計（同日重複呼叫則更新）
  INSERT INTO public.daily_history (stat_date, prep_amount, servings_count, revenue_amount)
  VALUES (v_date, v_prep, v_servings, v_revenue)
  ON CONFLICT (stat_date) DO UPDATE
  SET prep_amount = EXCLUDED.prep_amount,
      servings_count = EXCLUDED.servings_count,
      revenue_amount = EXCLUDED.revenue_amount;

  -- 封存當日訂單
  UPDATE public.orders
  SET is_archived = true
  WHERE is_archived = false
    AND (created_at AT TIME ZONE 'Asia/Taipei')::date = v_date;

  -- 清空庫存重新開始
  UPDATE public.ingredients SET current_stock = 0;

  RETURN jsonb_build_object(
    'date', v_date,
    'prep_amount', v_prep,
    'servings_count', v_servings,
    'revenue_amount', v_revenue
  );
END;
$$;