class AddComponentGraphDataToScreens < ActiveRecord::Migration[6.1]
  def change
    add_column :screens, :component_graph_data, :jsonb, default: {}
  end
end
