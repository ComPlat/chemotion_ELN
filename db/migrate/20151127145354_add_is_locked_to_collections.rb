class AddIsLockedToCollections < ActiveRecord::Migration
  def change
    add_column :collections, :is_locked, :boolean, default: false
  end
end
