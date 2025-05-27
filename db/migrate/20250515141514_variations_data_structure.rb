# frozen_string_literal: true

class VariationsDataStructure < ActiveRecord::Migration[6.1]
  # SecureRandom.uuid.freeze
  def up
    # set default from empty array to empty object
    change_column_default :reactions, :variations, from: [], to: {}
    execute <<-SQL.squish
      UPDATE reactions SET variations = '{}'::jsonb WHERE variations = '[]'::jsonb;
    SQL
    # transform array of variations to object of variations with UUID as key
    execute <<-SQL.squish
      UPDATE reactions
      SET variations = new_variations
        FROM (
          SELECT
            id,
            jsonb_object_agg(uuid_generate_v4(), variation) AS new_variations
          FROM reactions,
            LATERAL jsonb_array_elements(variations) AS variation
          WHERE jsonb_typeof(variations) = 'array'
          GROUP BY id
        ) AS sub
      WHERE reactions.id = sub.id and jsonb_typeof(variations) = 'array';
    SQL

    # add key: "uuid", value: UUID to variation
    execute <<-SQL.squish
      UPDATE reactions
      SET variations = (
        SELECT jsonb_object_agg(key, jsonb_set(value, '{uuid}', to_jsonb(key)))
        FROM jsonb_each(variations)
      )
      WHERE jsonb_typeof(variations) = 'object'
        and variations != '{}';
    SQL
  end

  def down
    # set default from empty object to empty array
    change_column_default :reactions, :variations, from: {}, to: []
    execute <<-SQL.squish
      UPDATE reactions SET variations = '[]'::jsonb WHERE variations = '{}'::jsonb;
    SQL
    # remove key: "uuid", value: UUID from variation and transform back into an array
    execute <<-SQL.squish
      WITH variations_data AS (
        SELECT
          reactions.id,
          jsonb_agg(v.value - 'uuid') AS simplified_variations
        FROM reactions,
          jsonb_each(reactions.variations) AS v
        WHERE jsonb_typeof(reactions.variations) = 'object'
        GROUP BY reactions.id
      )
      UPDATE reactions
      SET variations = variations_data.simplified_variations::jsonb
      FROM variations_data
      WHERE reactions.id = variations_data.id
        AND jsonb_typeof(reactions.variations) = 'object';
    SQL
  end
end
