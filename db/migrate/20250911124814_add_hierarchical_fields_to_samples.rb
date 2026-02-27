class AddHierarchicalFieldsToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :state, :string, comment: 'state of the Hierarchical sample'
    add_column :samples, :color, :string, comment: 'color of the Hierarchical sample'
    add_column :samples, :storage_condition, :string, comment: 'storage condition of the Hierarchical sample'
   
    add_column :samples, :height, :float, comment: 'height of the Hierarchical sample (numeric, in cm or mm)'
    add_column :samples, :width,  :float, comment: 'width of the Hierarchical sample (numeric, in cm or mm)'
    add_column :samples, :length, :float, comment: 'length of the Hierarchical sample (numeric, in cm or mm)'
  end
end
