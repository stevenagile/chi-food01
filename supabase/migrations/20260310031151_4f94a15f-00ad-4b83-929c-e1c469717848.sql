
-- 供應商表
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  phone text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read suppliers" ON public.suppliers FOR SELECT TO public USING (true);
CREATE POLICY "Public insert suppliers" ON public.suppliers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update suppliers" ON public.suppliers FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete suppliers" ON public.suppliers FOR DELETE TO public USING (true);

-- 原物料表
CREATE TABLE public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL DEFAULT '個',
  current_stock numeric NOT NULL DEFAULT 0,
  min_stock numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT '其他',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read ingredients" ON public.ingredients FOR SELECT TO public USING (true);
CREATE POLICY "Public insert ingredients" ON public.ingredients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update ingredients" ON public.ingredients FOR UPDATE TO public USING (true);
CREATE POLICY "Public delete ingredients" ON public.ingredients FOR DELETE TO public USING (true);

-- 進貨記錄表
CREATE TABLE public.purchase_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read purchase_records" ON public.purchase_records FOR SELECT TO public USING (true);
CREATE POLICY "Public insert purchase_records" ON public.purchase_records FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update purchase_records" ON public.purchase_records FOR UPDATE TO public USING (true);

-- 更新 ingredients 的 updated_at trigger
CREATE TRIGGER update_ingredients_updated_at
  BEFORE UPDATE ON public.ingredients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
