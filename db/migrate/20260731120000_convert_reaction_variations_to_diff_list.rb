# frozen_string_literal: true

# Reaction variations used to be a JSONB *object* keyed by variation UUID, and every variation
# carried an absolute copy of the reaction's materials and properties (`startingMaterials`,
# `reactants`, `products`, `solvents`, `properties`, `metadata`).
#
# They are now a JSONB *list*, and a variation stores only what differs from the reaction it belongs
# to, under `data`; everything it does not mention is read from the parent reaction. The format is
# documented in db/schemas/reaction_variations.schema.json.
#
# What this migration does NOT do: translate the old absolute values into a diff. The old material
# entries are written in a vocabulary of their own (`mass`/`amount`/`volume`/`equivalent` plus an
# `aux` block, keyed by sample id) which does not line up attribute for attribute with the reaction
# model the diff is expressed in, so rewriting them would mean guessing what each entry was meant to
# override. Instead every converted variation starts out with a diff that changes nothing - i.e. it
# reads as identical to its parent reaction - and keeps its former body verbatim under
# `legacy_data`. Nothing is lost, `down` puts it back, and a later migration can convert
# `legacy_data` into a real diff once the mapping has been decided.
#
# `data` therefore ends up carrying nothing but the identity of the reaction the row stands for.
# That one attribute is not optional: the client generates a fresh id for a row whose diff has none,
# which would give the row a different identity on every reload.
class ConvertReactionVariationsToDiffList < ActiveRecord::Migration[6.1]
  # Enforces the one invariant the database itself can express, so a regression that writes the old
  # object shape fails loudly instead of silently producing rows nothing can read. The per-element
  # rules live in the JSON schema: a CHECK constraint may not contain a subquery, which is what
  # walking the elements with jsonb_array_elements would require. jsonb_path_exists is a plain
  # function and needs none, hence the two path tests (PostgreSQL 12+; the ELN runs 16).
  CONSTRAINT_NAME = 'reactions_variations_is_diff_list'
  CONSTRAINT = <<~SQL.squish
    jsonb_typeof(variations) = 'array'
    AND NOT jsonb_path_exists(variations, '$[*] ? (@.type() != "object")')
    AND NOT jsonb_path_exists(
      variations,
      '$[*] ? (!(exists(@.id)) || !(exists(@.idx)) || !(exists(@.data)))'
    )
  SQL

  def up
    change_column_default :reactions, :variations, from: {}, to: []

    # Ordinality is the only order an object offers - jsonb sorts its keys and never kept the order
    # the variations were added in - so `idx` ends up deterministic but not necessarily the order
    # the rows had on screen before. Rows can be reordered in the grid afterwards.
    execute <<~SQL.squish
      UPDATE reactions
      SET variations = converted.variations
      FROM (
        SELECT
          r.id,
          jsonb_agg(
            jsonb_build_object(
              'id', COALESCE(v.value ->> 'uuid', v.key),
              'idx', v.ordinality - 1,
              'group', CASE jsonb_typeof(v.value -> 'metadata' -> 'group')
                WHEN 'array' THEN v.value -> 'metadata' -> 'group'
                WHEN 'object' THEN jsonb_build_array(
                  COALESCE(v.value -> 'metadata' -> 'group' -> 'group', '0'::jsonb),
                  COALESCE(v.value -> 'metadata' -> 'group' -> 'subgroup', '0'::jsonb)
                )
                ELSE '[0, 0]'::jsonb
              END,
              'analyses', COALESCE(v.value -> 'metadata' -> 'analyses', '[]'::jsonb),
              'notes', COALESCE(v.value -> 'metadata' ->> 'notes', ''),
              'data', jsonb_build_object('id', COALESCE(v.value ->> 'uuid', v.key)),
              'legacy_data', v.value
            )
            ORDER BY v.ordinality
          ) AS variations
        FROM reactions r,
          LATERAL jsonb_each(r.variations) WITH ORDINALITY AS v(key, value, ordinality)
        WHERE jsonb_typeof(r.variations) = 'object'
        GROUP BY r.id
      ) AS converted
      WHERE reactions.id = converted.id;
    SQL

    # Reactions without any variation, plus anything the column picked up that is neither the old
    # object nor a list.
    execute <<~SQL.squish
      UPDATE reactions
      SET variations = '[]'::jsonb
      WHERE variations IS NULL
         OR jsonb_typeof(variations) <> 'array';
    SQL

    execute <<~SQL.squish
      ALTER TABLE reactions
      ADD CONSTRAINT #{CONSTRAINT_NAME} CHECK (#{CONSTRAINT});
    SQL
  end

  def down
    execute <<~SQL.squish
      ALTER TABLE reactions DROP CONSTRAINT IF EXISTS #{CONSTRAINT_NAME};
    SQL

    # Only variations this migration converted can be restored: they are the ones still carrying
    # `legacy_data`. Rows written after the change have no counterpart in the old format - there is
    # no absolute set of values to rebuild them from without resolving the diff against the reaction
    # - and are dropped, which is what a downgrade to a version that cannot read them amounts to.
    execute <<~SQL.squish
      UPDATE reactions
      SET variations = COALESCE(restored.variations, '{}'::jsonb)
      FROM (
        SELECT
          r.id,
          jsonb_object_agg(
            COALESCE(v.value -> 'legacy_data' ->> 'uuid', v.value ->> 'id'),
            v.value -> 'legacy_data'
          ) FILTER (
            WHERE v.value ? 'legacy_data'
              AND COALESCE(v.value -> 'legacy_data' ->> 'uuid', v.value ->> 'id') IS NOT NULL
          ) AS variations
        FROM reactions r,
          LATERAL jsonb_array_elements(r.variations) AS v(value)
        WHERE jsonb_typeof(r.variations) = 'array'
        GROUP BY r.id
      ) AS restored
      WHERE reactions.id = restored.id;
    SQL

    execute <<~SQL.squish
      UPDATE reactions
      SET variations = '{}'::jsonb
      WHERE variations IS NULL
         OR jsonb_typeof(variations) <> 'object';
    SQL

    change_column_default :reactions, :variations, from: [], to: {}
  end
end
