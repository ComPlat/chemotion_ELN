CREATE TRIGGER inventory_mark_inventory_sample_trg
  AFTER INSERT OR UPDATE OF deleted_at, collection_id ON collections_samples
  FOR EACH ROW WHEN (NEW.deleted_at IS NULL)
  EXECUTE PROCEDURE inventory_mark_inventory_sample();
