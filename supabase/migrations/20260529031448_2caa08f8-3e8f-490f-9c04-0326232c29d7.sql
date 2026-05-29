-- Enable pg_cron for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Internal version of close_daily_stats without admin role check, for scheduled cron use
CREATE OR REPLACE FUNCTION public.close_daily_stats_cron()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Add unique constraint on daily_history.stat_date if not exists (required for ON CONFLICT)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'daily_history_stat_date_key'
  ) THEN
    ALTER TABLE public.daily_history ADD CONSTRAINT daily_history_stat_date_key UNIQUE (stat_date);
  END IF;
END $$;

-- Schedule daily close at 04:00 Asia/Taipei = 20:00 UTC (previous day)
-- Remove any existing schedule first to avoid duplicates
DO $$
DECLARE
  job_id BIGINT;
BEGIN
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'daily-close-stats';
  IF job_id IS NOT NULL THEN
    PERFORM cron.unschedule(job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'daily-close-stats',
  '0 20 * * *',
  $$ SELECT public.close_daily_stats_cron(); $$
);