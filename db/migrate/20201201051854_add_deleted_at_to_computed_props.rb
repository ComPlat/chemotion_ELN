class AddDeletedAtToComputedProps < ActiveRecord::Migration
  def change
    add_column :computed_props, :deleted_at, :datetime
    add_index :computed_props, :deleted_at
  end
end
