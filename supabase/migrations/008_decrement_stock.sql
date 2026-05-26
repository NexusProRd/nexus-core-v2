CREATE OR REPLACE FUNCTION public.decrement_stock(pid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE productos
  SET stock = GREATEST(0, stock - 1)
  WHERE id = pid AND stock > 0;
END;
$$;
