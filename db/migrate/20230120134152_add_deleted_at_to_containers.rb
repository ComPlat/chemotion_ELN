class AddDeletedAtToContainers < ActiveRecord::Migration[6.1]
  def change
    add_column :containers, :deleted_at, :datetime
  end
end
