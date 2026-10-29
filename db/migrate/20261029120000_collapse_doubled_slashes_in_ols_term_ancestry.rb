# frozen_string_literal: true

# Repairs ols_terms.ancestry values that OlsTerm.rebuilt_ancestry_by_owl_name wrote with doubled
# slashes ("/3//2/") when a child class preceded its parent in the imported OWL file. Such values
# fail ancestry validation and break the prefix queries behind +descendants+.
#
# Idempotent: it only touches rows that still contain "//".
class CollapseDoubledSlashesInOlsTermAncestry < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL.squish
      UPDATE ols_terms SET ancestry = regexp_replace(ancestry, '/{2,}', '/', 'g')
      WHERE ancestry LIKE '%//%'
    SQL
  end

  # Nothing to undo: the old values were invalid.
  def down; end
end
