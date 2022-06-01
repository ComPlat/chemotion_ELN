class AddScFieldsToSamples < ActiveRecord::Migration[5.2]
  def change
    add_column :samples, :state, :string
    add_column :samples, :color, :string
  end
end
