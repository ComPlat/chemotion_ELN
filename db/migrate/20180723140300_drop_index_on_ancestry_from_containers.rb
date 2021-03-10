class DropIndexOnAncestryFromContainers < ActiveRecord::Migration[4.2]
  disable_ddl_transaction!
  def self.up
    remove_index :containers, name: :index_containers_on_ancestry unless !index_name_exists?(:containers, "index_containers_on_ancestry")
  end
  def self.down
    add_index :containers, :ancestry, name: 'index_containers_on_ancestry', :algorithm => :concurrently unless index_name_exists?(:containers, "index_containers_on_ancestry")
  end
end
