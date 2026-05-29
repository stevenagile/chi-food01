-- ============================================================
-- 角色分權：admin（最高管理者）+ staff（一般工作人員）
-- ============================================================

-- 1) 通用判斷函式：admin 或 staff
CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  );
$$;

-- ============================================================
-- 2) orders：admin + staff 都能完整操作
-- ============================================================
DROP POLICY IF EXISTS admin_all ON public.orders;
CREATE POLICY staff_or_admin_all ON public.orders
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============================================================
-- 3) order_status_logs：admin + staff 都能完整操作
-- ============================================================
DROP POLICY IF EXISTS admin_all ON public.order_status_logs;
CREATE POLICY staff_or_admin_all ON public.order_status_logs
  FOR ALL TO authenticated
  USING (public.is_staff_or_admin(auth.uid()))
  WITH CHECK (public.is_staff_or_admin(auth.uid()));

-- ============================================================
-- 4) ingredients：admin 可全部；staff 只能 SELECT
-- ============================================================
DROP POLICY IF EXISTS admin_all ON public.ingredients;
CREATE POLICY admin_all ON public.ingredients
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY staff_select ON public.ingredients
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'));

-- ============================================================
-- 5) menu_item_ingredients：admin only（保持原樣，但 staff 需要 SELECT 才能看配方/可出份數）
-- ============================================================
CREATE POLICY staff_select ON public.menu_item_ingredients
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'));

-- ============================================================
-- 6) purchase_records：admin + staff 可 SELECT/INSERT；UPDATE/DELETE 限 admin
-- ============================================================
DROP POLICY IF EXISTS admin_all ON public.purchase_records;
CREATE POLICY admin_all ON public.purchase_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY staff_select ON public.purchase_records
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'));

CREATE POLICY staff_insert ON public.purchase_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'staff'));

-- ============================================================
-- 7) requisition_records：admin + staff 可 SELECT/INSERT；UPDATE/DELETE 限 admin
-- ============================================================
DROP POLICY IF EXISTS admin_all ON public.requisition_records;
CREATE POLICY admin_all ON public.requisition_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY staff_select ON public.requisition_records
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'));

CREATE POLICY staff_insert ON public.requisition_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'staff'));

-- ============================================================
-- 8) suppliers：staff 可 SELECT（登記進貨時需要選供應商），其餘 admin
--    daily_history / supplier_payments：admin only（保留原樣）
-- ============================================================
CREATE POLICY staff_select ON public.suppliers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'staff'));
