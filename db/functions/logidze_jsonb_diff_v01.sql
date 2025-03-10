CREATE OR REPLACE FUNCTION jsonb_diff(old jsonb, new jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS
$$
DECLARE
  result jsonb := '{}'::jsonb;
  v RECORD;
BEGIN
  -- If old is NULL, return the new object as the full difference
  IF old IS NULL OR jsonb_typeof(old) = 'null' THEN
    RETURN new;
  END IF;

  -- If new is NULL, return an empty JSON
  IF new IS NULL OR jsonb_typeof(new) = 'null' THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Iterate through each key-value pair in new
  FOR v IN SELECT * FROM jsonb_each(new) LOOP
    -- If the key is an object in both old and new, recurse
    IF jsonb_typeof(old -> v.key) = 'object' AND jsonb_typeof(new -> v.key) = 'object' THEN
      DECLARE nested_diff jsonb;
      nested_diff := jsonb_diff(old -> v.key, new -> v.key);
      IF nested_diff <> '{}'::jsonb THEN
        result := result || jsonb_build_object(v.key, nested_diff);
      END IF;
    -- If values are different, add to the result
    ELSIF (old -> v.key) IS DISTINCT FROM v.value THEN
      result := result || jsonb_build_object(v.key, v.value);
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

