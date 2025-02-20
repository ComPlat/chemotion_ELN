-- Purpose: Create the standard logidze trigger for a table to log changes to a history column.
-- Usage: SELECT create_logidze_trigger('table_name', 'trigger_name', 'timestamp_column');
-- Parameters:
--   table_name: The name of the table to create the trigger for.
--   trigger_name: The name of the trigger to create.
--   timestamp_column: The name of the column to use as the timestamp for the history.
CREATE OR REPLACE FUNCTION logidze_create_trigger_on_table (table_name text, trigger_name text, timestamp_column text)
    RETURNS VOID
    AS $$
BEGIN
    -- CREATE TRIGGER logidze_on_{table_name}
    -- Parameters: history_size_limit (integer), timestamp_column (text), filtered_columns (text[]),
    -- include_columns (boolean), debounce_time_ms (integer)
    EXECUTE format( '
        CREATE TRIGGER %I
        BEFORE UPDATE OR INSERT ON %I
        FOR EACH ROW
        WHEN (coalesce(current_setting(''logidze.disabled'', true), '''') <> ''on'')
        EXECUTE PROCEDURE logidze_logger(null, %L)', trigger_name, table_name, timestamp_column);
END;
$$
LANGUAGE plpgsql;

