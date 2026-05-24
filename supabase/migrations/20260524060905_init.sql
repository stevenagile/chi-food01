-- ============================================================================
-- 00_init.sql — 虎秋文昌雞 POS 系統 v2 一次性 init schema
-- ============================================================================
-- 設計原則：
--   - 把原本 17 個漸進 migration + fix_001~004 的修補全部整併成一份
--   - 重跑安全（SECTION A 先 DROP 所有東西，然後 SECTION B 重建）
--   - 內含：BOM 扣減 trigger（單一份，無重複）、台北時區處理、
--           UPSERT 版 close_daily_stats、archive 內含結算、
--           anon 顧客點單 / authenticated 後台 RLS、has_role function
--   - admin role gate 預留註解段（SECTION E），等 admin 帳號註冊好再解開
--
-- 怎麼用：
--   1. Supabase Dashboard → SQL Editor → 新 query
--   2. 整份貼進去，一次 RUN
--   3. SECTION F 跑驗證 query 確認結果
--   4. 任何錯誤都會 ROLLBACK，DB 不會留下半成品狀態
--
-- ⚠️ 警告：這份會 DROP 所有現有資料表，所有資料消失。重設用，不是 patch。
-- ============================================================================


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION A：WIPE — 清掉所有舊東西
-- ████████████████████████████████████████████████████████████████████████████

-- A1. 先清掉 auth.users 上的 trigger（不在 public schema，要單獨處理）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- A2. 清掉所有自訂 function（CASCADE 順帶把依賴的 trigger 也清了）
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.deduct_ingredients_on_order_complete() CASCADE;
DROP FUNCTION IF EXISTS public.check_ingredient_availability(jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.close_daily_stats() CASCADE;
DROP FUNCTION IF EXISTS public.archive_all_orders() CASCADE;

-- A3. 清掉所有 public schema 的資料表（CASCADE 處理 FK）
DROP TABLE IF EXISTS public.order_status_logs CASCADE;
DROP TABLE IF EXISTS public.daily_history CASCADE;
DROP TABLE IF EXISTS public.supplier_payments CASCADE;
DROP TABLE IF EXISTS public.requisition_records CASCADE;
DROP TABLE IF EXISTS public.purchase_records CASCADE;
DROP TABLE IF EXISTS public.menu_item_ingredients CASCADE;
DROP TABLE IF EXISTS public.ingredients CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION B：BUILD — 建表 + index + 約束
-- ████████████████████████████████████████████████████████████████████████████

-- ─────────── 使用者相關 ───────────

CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- ─────────── 食材 / BOM / 進貨 / 領用 ───────────

CREATE TABLE public.suppliers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  contact    TEXT,
  phone      TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ingredients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  unit          TEXT NOT NULL DEFAULT '份',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock     NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  supplier_id   UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  category      TEXT NOT NULL DEFAULT '其他',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ingredients_supplier ON public.ingredients (supplier_id);

CREATE TABLE public.menu_item_ingredients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id TEXT NOT NULL,            -- 對應 src/data/menu.ts 的 id（e.g. 'r1', 'p1'）
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity     NUMERIC NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, ingredient_id)
);
CREATE INDEX idx_mii_menu_item ON public.menu_item_ingredients (menu_item_id);
CREATE INDEX idx_mii_ingredient ON public.menu_item_ingredients (ingredient_id);

CREATE TABLE public.purchase_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantity      NUMERIC NOT NULL,
  unit_price    NUMERIC NOT NULL,
  total_price   NUMERIC NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_purchase_date ON public.purchase_records (purchase_date DESC);

CREATE TABLE public.requisition_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id    UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  requisition_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  quantity         NUMERIC NOT NULL,
  purpose          TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.supplier_payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id        UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_record_id UUID REFERENCES public.purchase_records(id) ON DELETE SET NULL,
  amount             NUMERIC NOT NULL,
  payment_method     TEXT,
  payment_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_settled         BOOLEAN NOT NULL DEFAULT false,
  settled_at         TIMESTAMPTZ,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────── 訂單相關 ───────────

CREATE TABLE public.orders (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('內用', '外帶')),
  table_number    TEXT,
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  total           NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT '待確認' CHECK (status IN ('待確認', '製作中', '已完成', '已取消')),
  payment_status  TEXT NOT NULL DEFAULT '未付款' CHECK (payment_status IN ('未付款', '已付款')),
  payment_method  TEXT,
  customer_name   TEXT,
  customer_phone  TEXT,
  guest_count     INTEGER,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  cooking_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_archived ON public.orders (is_archived) WHERE is_archived = false;

CREATE TABLE public.order_status_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT NOT NULL,
  changed_by      UUID,
  changed_by_name TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_osl_order ON public.order_status_logs (order_id);

CREATE TABLE public.daily_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date       DATE NOT NULL UNIQUE,         -- 一天只有一列（UPSERT 用）
  prep_amount     NUMERIC NOT NULL DEFAULT 0,
  servings_count  INTEGER NOT NULL DEFAULT 0,
  revenue_amount  NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION C：FUNCTIONS — 業務邏輯
-- ████████████████████████████████████████████████████████████████████████████

-- C1. 通用：updated_at 自動更新
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- C2. 角色檢查（給 RLS 用）
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- C3. 新使用者註冊 → 自動建 profile
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

-- C4. 自動扣食材（INSERT 扣，UPDATE OF status 處理取消↔復原）
CREATE OR REPLACE FUNCTION public.deduct_ingredients_on_order_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item         JSONB;
  menu_id      TEXT;
  qty          INT;
  mapping      RECORD;
  v_today      DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
  v_order_date DATE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_order_date := (NEW.created_at AT TIME ZONE 'Asia/Taipei')::date;
    IF v_order_date <> v_today THEN
      RETURN NEW;
    END IF;
    IF NEW.status = '已取消' THEN
      RETURN NEW;
    END IF;
    FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
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
    -- 非取消 → 取消：還原
    IF NEW.status = '已取消' AND OLD.status IS DISTINCT FROM '已取消' THEN
      FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
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
    -- 取消 → 非取消：重新扣減
    IF OLD.status = '已取消' AND NEW.status IS DISTINCT FROM '已取消' THEN
      FOR item IN SELECT jsonb_array_elements(NEW.items) LOOP
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
$$;

-- C5. 庫存夠不夠（給 webhook-order Edge Function 用）
CREATE OR REPLACE FUNCTION public.check_ingredient_availability(p_items JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item        JSONB;
  v_menu_id     TEXT;
  v_qty         NUMERIC;
  v_required    NUMERIC;
  v_unavailable JSONB := '[]'::jsonb;
  v_rec         RECORD;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
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
          'ingredient',   v_rec.name,
          'required',     v_required,
          'stock',        v_rec.current_stock
        );
      END IF;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object(
    'available',          jsonb_array_length(v_unavailable) = 0,
    'unavailable_items',  v_unavailable
  );
END;
$$;

-- C6. 每日結算（UPSERT、台北時區、排除已取消）
CREATE OR REPLACE FUNCTION public.close_daily_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue NUMERIC;
  v_count   INTEGER;
  v_date    DATE := (now() AT TIME ZONE 'Asia/Taipei')::date;
BEGIN
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
$$;

-- C7. 歸零：內部先結算再 archive
CREATE OR REPLACE FUNCTION public.archive_all_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  v_stats := public.close_daily_stats();
  UPDATE public.orders SET is_archived = true WHERE is_archived = false;
  RETURN v_stats;
END;
$$;


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION D：TRIGGERS — 掛上去
-- ████████████████████████████████████████████████████████████████████████████

-- D1. 新使用者註冊 → 建 profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- D2. orders updated_at 自動維護
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- D3. 訂單成立 → 自動扣食材
CREATE TRIGGER trg_deduct_ingredients_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_ingredients_on_order_complete();

-- D4. 訂單狀態變更（取消↔復原）→ 補/扣
CREATE TRIGGER trg_deduct_ingredients_update
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.deduct_ingredients_on_order_complete();


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION E：RLS — 預設 authenticated 全權（admin role gate 留註解）
-- ████████████████████████████████████████████████████████████████████████████

-- 全部開 RLS
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_history         ENABLE ROW LEVEL SECURITY;

-- ─── profiles：自己看自己 ───
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ─── user_roles：自己看自己 ───
CREATE POLICY "own_roles_select" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ─── 後台 9 張表：authenticated 全權 ───
-- 這是 Phase 1 寬鬆設定（任何 logged-in 都能做後台）。
-- Phase 2 升級成 admin role gate 看 SECTION E2（解開註解前先註冊 admin）。
CREATE POLICY "auth_all" ON public.orders                FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.ingredients           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.menu_item_ingredients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.suppliers             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.purchase_records      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.requisition_records   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.supplier_payments     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.daily_history         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON public.order_status_logs     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── anon 顧客：點單路徑最小權限 ───
CREATE POLICY "anon_insert_orders" ON public.orders
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_select_orders" ON public.orders
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_ingredients" ON public.ingredients
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_menu_item_ingredients" ON public.menu_item_ingredients
  FOR SELECT TO anon USING (true);


-- ─────────── E2：Phase 2 admin role gate（預設註解）───────────
-- 等你註冊一個 admin 帳號、把 uid 寫進 user_roles 後再解開：
--   1. 拿掉下面整段 BEGIN...COMMIT 前後的 /* 跟 */
--   2. 跑一次，會把上面的 auth_all 改成 admin-only
-- 詳細步驟看 README_reset.md 的「Phase 2：升級成 admin 閘門」

/*
BEGIN;

DROP POLICY IF EXISTS "auth_all" ON public.orders;
DROP POLICY IF EXISTS "auth_all" ON public.ingredients;
DROP POLICY IF EXISTS "auth_all" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "auth_all" ON public.suppliers;
DROP POLICY IF EXISTS "auth_all" ON public.purchase_records;
DROP POLICY IF EXISTS "auth_all" ON public.requisition_records;
DROP POLICY IF EXISTS "auth_all" ON public.supplier_payments;
DROP POLICY IF EXISTS "auth_all" ON public.daily_history;
DROP POLICY IF EXISTS "auth_all" ON public.order_status_logs;

CREATE POLICY "admin_all" ON public.orders                FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.ingredients           FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.menu_item_ingredients FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.suppliers             FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.purchase_records      FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.requisition_records   FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.supplier_payments     FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.daily_history         FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_all" ON public.order_status_logs     FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMIT;
*/


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION F：VERIFY — 跑完後確認
-- ████████████████████████████████████████████████████████████████████████████

-- F1. 11 張表都建好
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 期望：daily_history, ingredients, menu_item_ingredients, order_status_logs,
--       orders, profiles, purchase_records, requisition_records,
--       supplier_payments, suppliers, user_roles

-- F2. orders 上 trigger 數量正確
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.orders'::regclass AND NOT tgisinternal
ORDER BY tgname;
-- 期望：trg_deduct_ingredients_insert, trg_deduct_ingredients_update, update_orders_updated_at

-- F3. RLS policy 數量
SELECT tablename, count(*) AS policy_count
FROM pg_policies WHERE schemaname = 'public'
GROUP BY tablename ORDER BY tablename;
-- 期望：orders=3 (auth_all + anon_insert + anon_select)
--       ingredients=2, menu_item_ingredients=2
--       profiles=2, user_roles=1
--       其他 6 張表各 1 條 auth_all


-- ████████████████████████████████████████████████████████████████████████████
-- SECTION G：SEED（可選，測試用，預設註解）
-- ████████████████████████████████████████████████████████████████████████████
-- 拿掉註解可以塞一個測試廠商 + 幾個食材 + 兩條 BOM，
-- 方便你立即測試「下單會不會扣食材」。

/*
INSERT INTO public.suppliers (id, name, contact, phone)
VALUES ('00000000-0000-0000-0000-000000000001', '虎秋指定肉商', '張老闆', '0912345678');

INSERT INTO public.ingredients (id, name, unit, current_stock, min_stock, cost_per_unit, category, supplier_id)
VALUES
  ('00000000-0000-0000-0000-000000000010', '文昌雞肉', '隻',  20, 5, 380, '主料', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000011', '海南雞飯',  '份', 50, 10, 12, '主食', NULL),
  ('00000000-0000-0000-0000-000000000012', '雞腿',     '隻',  30, 5, 60, '主料', '00000000-0000-0000-0000-000000000001');

-- BOM：菜單 id 對照 src/data/menu.ts
INSERT INTO public.menu_item_ingredients (menu_item_id, ingredient_id, quantity)
VALUES
  ('r1', '00000000-0000-0000-0000-000000000010', 0.25),  -- 雞肉飯：0.25 隻雞
  ('r1', '00000000-0000-0000-0000-000000000011', 1),     -- 雞肉飯：1 份飯
  ('r2', '00000000-0000-0000-0000-000000000012', 1),     -- 雞腿飯：1 隻腿
  ('r2', '00000000-0000-0000-0000-000000000011', 1);     -- 雞腿飯：1 份飯
*/
