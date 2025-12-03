# frozen_string_literal: true

class AddAncestryIndexToElements < ActiveRecord::Migration[6.1]
  INDEX_NAME = 'index_elements_on_ancestry'

  def up
    execute <<~SQL.squish
      CREATE INDEX #{INDEX_NAME}
      ON elements (ancestry COLLATE "C" varchar_pattern_ops)
      WHERE deleted_at IS NULL;
    SQL
  end

  def down
    execute <<~SQL.squish
      DROP INDEX IF EXISTS #{INDEX_NAME};
    SQL
  end
end
