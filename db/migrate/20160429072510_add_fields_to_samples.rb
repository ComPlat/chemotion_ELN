class AddFieldsToSamples < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :density, :float, null: false, default: 1.0
    add_column :samples, :melting_point, :float
    add_column :samples, :boiling_point, :float
  end
end
