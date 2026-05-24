
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- Create a function to archive all non-archived orders
CREATE OR REPLACE FUNCTION public.archive_all_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.orders SET is_archived = true WHERE is_archived = false;
END;
$$;

-- Enable pg_cron extension and schedule 9 PM daily archive (Asia/Taipei timezone)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'archive-orders-daily-9pm',
  '0 13 * * *',  -- 13:00 UTC = 21:00 Asia/Taipei
  $$SELECT public.archive_all_orders()$$
);
