class AddWellReadout < ActiveRecord::Migration[4.2]
  def change
    add_column :wells, :readout, :string, null: true
    add_column :wells, :additive, :string, null: true
  end
end
