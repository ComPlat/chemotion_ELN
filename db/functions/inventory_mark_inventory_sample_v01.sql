CREATE OR REPLACE FUNCTION inventory_mark_inventory_sample()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM inventory_managed_collections
    WHERE collection_id = NEW.collection_id AND archived_at IS NULL
  ) THEN
    UPDATE samples SET inventory_sample = true
    WHERE id = NEW.sample_id AND inventory_sample IS DISTINCT FROM true;
  END IF;
  RETURN NEW;
END;
$$;
