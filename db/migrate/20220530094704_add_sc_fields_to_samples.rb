class AddScFieldsToSamples < ActiveRecord::Migration[5.2]
  def change
    add_column :samples, :aggregateState, :string
    add_column :samples, :color, :string
  end
end
