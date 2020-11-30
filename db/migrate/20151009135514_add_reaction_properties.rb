class AddReactionProperties < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions, :description, :text
    add_column :reactions, :timestamp_start, :string
    add_column :reactions, :timestamp_stop, :string
    add_column :reactions, :observation, :text
    add_column :reactions, :purification, :string, default: [], array: true
    add_column :reactions, :dangerous_products, :string, default: [], array: true
    add_column :reactions, :solvents, :string
    add_column :reactions, :tlc_description, :text
    add_column :reactions, :rf_value, :string
    add_column :reactions, :temperature, :string
    add_column :reactions, :status, :string
  end
end
