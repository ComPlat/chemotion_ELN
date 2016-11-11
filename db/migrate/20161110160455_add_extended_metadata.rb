class AddExtendedMetadata < ActiveRecord::Migration
  def change
    add_column :containers, :extended_metadata, :hstore, null: false, default: ''
  end
end
