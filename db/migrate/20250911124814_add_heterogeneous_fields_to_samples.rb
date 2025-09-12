class AddHeterogeneousFieldsToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :state, :string, comment: 'state of the Heterogeneous sample'
    add_column :samples, :color, :string, comment: 'color of the Heterogeneous sample'
    add_column :samples, :storage_condition, :string, comment: 'storage condition of the Heterogeneous sample'
   
    add_column :samples, :height, :float, comment: 'height of the Heterogeneous sample (numeric, in cm or mm)'
    add_column :samples, :width,  :float, comment: 'width of the Heterogeneous sample (numeric, in cm or mm)'
    add_column :samples, :length, :float, comment: 'length of the Heterogeneous sample (numeric, in cm or mm)'
  end
end
