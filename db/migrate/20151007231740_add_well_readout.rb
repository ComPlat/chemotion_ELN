class AddWellReadout < ActiveRecord::Migration
  def change
    add_column :wells, :readout, :string, null: true
    add_column :wells, :additive, :string, null: true
  end
end
