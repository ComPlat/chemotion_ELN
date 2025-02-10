CREATE TRIGGER lab_trg_layers_changes
    AFTER UPDATE ON layers
    FOR EACH ROW
    EXECUTE FUNCTION lab_record_layers_changes();
