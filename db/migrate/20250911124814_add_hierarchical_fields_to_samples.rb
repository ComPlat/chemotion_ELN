class AddHierarchicalFieldsToSamples < ActiveRecord::Migration[6.1]
  def up
    add_column :samples, :state, :string, comment: 'state of the Hierarchical sample' unless column_exists?(:samples, :state)
    add_column :samples, :color, :string, comment: 'color of the Hierarchical sample' unless column_exists?(:samples, :color)
    add_column :samples, :storage_condition, :string, comment: 'storage condition of the Hierarchical sample' unless column_exists?(:samples, :storage_condition)
    add_column :samples, :height, :float, comment: 'height of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :height)
    add_column :samples, :width, :float, comment: 'width of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :width)
    add_column :samples, :length, :float, comment: 'length of the Hierarchical sample (numeric, in cm or mm)' unless column_exists?(:samples, :length)
  end

  def down
    remove_column :samples, :state, :string if column_exists?(:samples, :state)
    remove_column :samples, :color, :string if column_exists?(:samples, :color)
    remove_column :samples, :storage_condition, :string if column_exists?(:samples, :storage_condition)
    remove_column :samples, :height, :float if column_exists?(:samples, :height)
    remove_column :samples, :width, :float if column_exists?(:samples, :width)
    remove_column :samples, :length, :float if column_exists?(:samples, :length)
  end
end
