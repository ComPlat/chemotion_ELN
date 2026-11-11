# frozen_string_literal: true

# Collections whose inventory label was reset used to keep pointing at an inventory without a
# prefix or name. Detach them and drop those inventories once nothing references them.
class DetachCollectionsFromBlankInventories < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL.squish
      UPDATE collections SET inventory_id = NULL
      WHERE inventory_id IN (SELECT id FROM inventories WHERE prefix IS NULL OR prefix = '')
    SQL
    execute <<~SQL.squish
      DELETE FROM inventories
      WHERE (prefix IS NULL OR prefix = '')
        AND NOT EXISTS (SELECT 1 FROM collections WHERE collections.inventory_id = inventories.id)
    SQL
  end

  def down
    # Detached collections and removed blank inventories carried no label to restore.
  end
end
