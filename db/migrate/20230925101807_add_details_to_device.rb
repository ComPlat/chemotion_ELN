class AddDetailsToDevice < ActiveRecord::Migration[6.1]
  def change
    add_column :users, :is_super_device, :boolean, :default => false
  end
end
