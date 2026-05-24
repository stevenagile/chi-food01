
CREATE TABLE public.requisition_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL,
  purpose text DEFAULT '日常領用',
  requisition_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.requisition_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read requisition_records" ON public.requisition_records FOR SELECT TO public USING (true);
CREATE POLICY "Public insert requisition_records" ON public.requisition_records FOR INSERT TO public WITH CHECK (true);
