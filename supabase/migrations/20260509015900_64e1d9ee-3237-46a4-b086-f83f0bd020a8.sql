CREATE TABLE public.order_status_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_status_logs_order_id ON public.order_status_logs(order_id);
CREATE INDEX idx_order_status_logs_created_at ON public.order_status_logs(created_at DESC);

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read order_status_logs"
  ON public.order_status_logs FOR SELECT
  USING (true);

CREATE POLICY "Public insert order_status_logs"
  ON public.order_status_logs FOR INSERT
  WITH CHECK (true);
