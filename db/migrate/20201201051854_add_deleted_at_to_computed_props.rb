class AddDeletedAtToComputedProps < ActiveRecord::Migration[4.2]
  def change
    add_column :computed_props, :deleted_at, :datetime
    add_index :computed_props, :deleted_at
  end
end
