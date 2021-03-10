class AddIndexOnContainableToContainers < ActiveRecord::Migration[4.2]
  disable_ddl_transaction!
  def self.up
    add_index :containers, [:containable_type, :containable_id], name: 'index_containers_on_containable', :algorithm => :concurrently unless index_name_exists?(:containers, "index_containers_on_containable")
  end
  def self.down
    remove_index :containers, name: :index_containers_on_containable unless !index_name_exists?(:containers, "index_containers_on_containable")
  end
end
