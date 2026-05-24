-- Drop the duplicate trigger that also fires on UPDATE
DROP TRIGGER IF EXISTS trg_deduct_ingredients_on_complete ON public.orders;

-- Fix the over-restored stock: subtract 0.25 to correct the double-restore
UPDATE public.ingredients
SET current_stock = current_stock - 0.25
WHERE name = '文昌雞';