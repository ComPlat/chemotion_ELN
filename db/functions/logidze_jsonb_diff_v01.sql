CREATE OR REPLACE FUNCTION jsonb_diff(old jsonb, new jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS
$$
DECLARE
  result jsonb := '{}'::jsonb;
  v RECORD;
  nested_diff jsonb;
  new_length int;
  old_length int;
BEGIN
  -- If old is NULL, return the new object as the full difference
  IF old IS NULL OR jsonb_typeof(old) = 'null' THEN
    RETURN new;
  END IF;

  -- If new is NULL, return an empty JSON
  IF new IS NULL OR jsonb_typeof(new) = 'null' THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Handle top-level arrays
  IF jsonb_typeof(old) = 'array' AND jsonb_typeof(new) = 'array' THEN
    IF result = '{}' THEN
      result := '[]';
    END IF;

    -- If arrays are equal, return an empty JSON
    IF old = new THEN
      RETURN '[]'::jsonb;
    ELSE
      -- Return the new array as the diff
      -- Get array lengths
      new_length := JSONB_ARRAY_LENGTH(new);
      old_length := JSONB_ARRAY_LENGTH(old);

      -- Loop through the array using an index
      FOR i IN 0..new_length-1 LOOP
        IF i <= old_length THEN
          IF jsonb_typeof(new[i]) IN ('object','array') AND jsonb_typeof(old[i]) IN ('object','array') THEN
            nested_diff := jsonb_diff(old[i], new[i]);
            IF nested_diff <> '{}'::jsonb THEN
              result := result || nested_diff;
            END IF;
          ELSIF new[i] IS DISTINCT FROM old[i] THEN
            result := result || new[i];
          END IF;
        ELSE
          RETURN new[i];
        END IF;
      END LOOP;
      RETURN result;
    END IF;
  END IF;

  -- If types differ (object vs. array), return the full new value
  IF jsonb_typeof(old) <> jsonb_typeof(new) THEN
    RETURN new;
  END IF;

  -- Iterate through each key-value pair in new
  FOR v IN SELECT * FROM jsonb_each(new) LOOP
    -- If the key is an object in both old and new, recurse
    IF jsonb_typeof(old -> v.key) = 'object' AND jsonb_typeof(new -> v.key) = 'object' THEN
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

