class AddElementKlassActive < ActiveRecord::Migration

  def up
    add_column :element_klasses, :is_active, :boolean, null:false, default: true unless column_exists? :element_klasses, :is_active
  end

  def down
    remove_column :element_klasses, :is_active, :boolean if column_exists? :element_klasses, :is_active

  end
end
