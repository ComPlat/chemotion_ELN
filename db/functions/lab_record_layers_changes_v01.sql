CREATE OR REPLACE FUNCTION lab_record_layers_changes()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        INSERT INTO layer_tracks (name, label, description, properties, identifier, created_by, created_at, updated_by, updated_at, deleted_by, deleted_at)
        VALUES (OLD.name, OLD.label, OLD.description, OLD.properties, OLD.identifier, OLD.created_by, OLD.created_at, OLD.updated_by, OLD.updated_at, OLD.deleted_by, OLD.deleted_at);
    EXCEPTION
        WHEN OTHERS THEN
            -- Ensure the main operation still completes successfully
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
