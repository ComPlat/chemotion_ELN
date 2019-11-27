class AddCollectionsElementsType < ActiveRecord::Migration
  def self.up
    add_column :collections_elements, :element_type, :string unless column_exists? :collections_elements, :element_type
  end

  def self.down
    remove_column :collections_elements, :element_type, :string if column_exists? :collections_elements, :element_type
  end

end
