# frozen_string_literal: true

class RmDupCollectionsCellline < ActiveRecord::Migration[6.1]
  def up
    # Remove duplicate collections_celllines records before adding unique index on collection_id and cellline_sample_id
    # to collections_celllines table. This is to ensure that the unique index can be added without any issues.
    # The duplicate records are removed based on the collection_id and cellline_sample_id columns.
    # The records with the deleted_at = null should be retained if one is present in a duplicate set.
    execute <<-SQL.squish
      DELETE FROM collections_celllines
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (partition BY collection_id, cellline_sample_id ORDER BY deleted_at DESC) AS rnum
          FROM collections_celllines
        ) t
        WHERE t.rnum > 1
      )
    SQL
  end

  def down
    # raise ActiveRecord::IrreversibleMigration
  end
end
