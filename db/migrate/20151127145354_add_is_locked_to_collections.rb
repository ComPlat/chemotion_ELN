class AddIsLockedToCollections < ActiveRecord::Migration[4.2]
  def change
    add_column :collections, :is_locked, :boolean, default: false
  end
end
