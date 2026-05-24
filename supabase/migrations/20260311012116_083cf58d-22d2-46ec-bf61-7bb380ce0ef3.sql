
CREATE TABLE public.supplier_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_record_id uuid REFERENCES public.purchase_records(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  payment_method text DEFAULT '現金',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  is_settled boolean NOT NULL DEFAULT false,
  settled_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read supplier_payments" ON public.supplier_payments FOR SELECT TO public USING (true);
CREATE POLICY "Public insert supplier_payments" ON public.supplier_payments FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public update supplier_payments" ON public.supplier_payments FOR UPDATE TO public USING (true);
