class AddIndexOnContainableToContainers < ActiveRecord::Migration
  disable_ddl_transaction!
  def self.up
    add_index :containers, [:containable_type, :containable_id], name: 'index_containers_on_containable', :algorithm => :concurrently unless index_name_exists?(:containers, "index_containers_on_containable", false)
  end
  def self.down
    remove_index :containers, name: :index_containers_on_containable unless !index_name_exists?(:containers, "index_containers_on_containable", true)
  end
end
