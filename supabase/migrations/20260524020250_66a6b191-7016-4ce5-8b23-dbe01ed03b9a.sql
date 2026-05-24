
-- ============ profiles 與 user_roles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ suppliers ============
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ingredients ============
CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '份',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT '其他',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ menu_item_ingredients ============
CREATE TABLE public.menu_item_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id TEXT NOT NULL,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ purchase_records ============
CREATE TABLE public.purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ requisition_records ============
CREATE TABLE public.requisition_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  requisition_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantity NUMERIC NOT NULL,
  purpose TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ supplier_payments ============
CREATE TABLE public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_record_id UUID REFERENCES public.purchase_records(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ orders ============
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  table_number TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '待確認',
  payment_status TEXT NOT NULL DEFAULT '未付款',
  payment_method TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  guest_count INTEGER,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  cooking_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ order_status_logs ============
CREATE TABLE public.order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ daily_history ============
CREATE TABLE public.daily_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  prep_amount NUMERIC NOT NULL DEFAULT 0,
  servings_count INTEGER NOT NULL DEFAULT 0,
  revenue_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Enable RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_history ENABLE ROW LEVEL SECURITY;

-- ============ RLS Policies (authenticated full access) ============
CREATE POLICY "auth_all" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.menu_item_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.purchase_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.requisition_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.supplier_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.order_status_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.daily_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ Functions ============
CREATE OR REPLACE FUNCTION public.check_ingredient_availability(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item JSONB;
  v_menu_id TEXT;
  v_qty NUMERIC;
  v_required NUMERIC;
  v_stock NUMERIC;
  v_unavailable JSONB := '[]'::jsonb;
  v_rec RECORD;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_id := v_item->'menuItem'->>'id';
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    FOR v_rec IN
      SELECT mi.quantity AS recipe_qty, i.current_stock, i.name
      FROM public.menu_item_ingredients mi
      JOIN public.ingredients i ON i.id = mi.ingredient_id
      WHERE mi.menu_item_id = v_menu_id
    LOOP
      v_required := v_rec.recipe_qty * v_qty;
      IF v_rec.current_stock < v_required THEN
        v_unavailable := v_unavailable || jsonb_build_object(
          'menu_item_id', v_menu_id,
          'ingredient', v_rec.name,
          'required', v_required,
          'stock', v_rec.current_stock
        );
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object(
    'available', jsonb_array_length(v_unavailable) = 0,
    'unavailable_items', v_unavailable
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_all_orders()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.orders SET is_archived = true WHERE is_archived = false;
$$;

CREATE OR REPLACE FUNCTION public.close_daily_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue NUMERIC;
  v_count INTEGER;
  v_date DATE := CURRENT_DATE;
BEGIN
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_revenue, v_count
  FROM public.orders
  WHERE DATE(created_at) = v_date AND is_archived = false;

  INSERT INTO public.daily_history (stat_date, revenue_amount, servings_count)
  VALUES (v_date, v_revenue, v_count);

  UPDATE public.orders SET is_archived = true
  WHERE DATE(created_at) = v_date AND is_archived = false;

  RETURN jsonb_build_object('date', v_date, 'revenue', v_revenue, 'count', v_count);
END;
$$;
