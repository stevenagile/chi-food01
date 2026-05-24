
CREATE OR REPLACE FUNCTION public.archive_all_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.orders
  SET is_archived = true
  WHERE is_archived = false
    AND created_at::date = (now() AT TIME ZONE 'Asia/Taipei')::date;
END;
$$;
