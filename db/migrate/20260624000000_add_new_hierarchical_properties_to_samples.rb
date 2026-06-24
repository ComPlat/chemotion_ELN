class AddNewHierarchicalPropertiesToSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :samples, :layer_thickness, :string, comment: 'Layer thickness of the Hierarchical sample'
    add_column :samples, :liquid_medium, :string, comment: 'Liquid medium of the Hierarchical sample'
    add_column :samples, :stabilizer, :string, comment: 'Stabilizer of the Hierarchical sample'
  end
end
