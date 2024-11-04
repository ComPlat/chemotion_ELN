class AddColUsedSpace < ActiveRecord::Migration[6.1]
  def up
    add_column :users, :used_space, :bigint, :default => 0
    add_column :users, :available_space, :bigint, :default => 0

    create_function :calculate_dataset_space
    create_function :calculate_element_space
    create_function :calculate_collection_space
    create_function :calculate_used_space
    execute "update users set used_space = calculate_used_space(id);"
  end
  def down
    drop_function :calculate_used_space
    drop_function :calculate_collection_space
    drop_function :calculate_element_space
    drop_function :calculate_dataset_space
    remove_column :users, :available_space, :bigint
    remove_column :users, :used_space, :bigint
  end
end
