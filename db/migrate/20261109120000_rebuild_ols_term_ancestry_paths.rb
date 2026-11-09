# frozen_string_literal: true

# Rebuilds ols_terms.ancestry as full materialized_path2 paths ("/root/…/parent/").
#
# Terms imported by early versions of the OLS import store only their direct parent
# ("/parent/"), so ancestry queries (descendants, subtree, root, depth) miss them. Each
# term keeps its current direct parent (the last id of its ancestry); only the path above
# it is rebuilt. A term whose parent is missing or belongs to another ontology becomes a
# root.
#
# Idempotent: rows whose ancestry is already the full path are not touched.
class RebuildOlsTermAncestryPaths < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL.squish
      WITH RECURSIVE nodes AS (
        SELECT id, owl_name, substring(ancestry from '([0-9]+)/*$')::int AS parent_id
        FROM ols_terms
      ), tree AS (
        SELECT n.id, n.owl_name, '/'::text AS path
        FROM nodes n
        WHERE NOT EXISTS (SELECT 1 FROM nodes p WHERE p.id = n.parent_id AND p.owl_name = n.owl_name)
        UNION ALL
        SELECT c.id, c.owl_name, tree.path || tree.id || '/'
        FROM nodes c JOIN tree ON c.parent_id = tree.id AND c.owl_name = tree.owl_name
      )
      UPDATE ols_terms o SET ancestry = coalesce(tree.path, '/')
      FROM nodes LEFT JOIN tree ON tree.id = nodes.id
      WHERE o.id = nodes.id AND o.ancestry IS DISTINCT FROM coalesce(tree.path, '/')
    SQL
  end

  # Nothing to undo: the truncated paths were incomplete.
  def down; end
end
