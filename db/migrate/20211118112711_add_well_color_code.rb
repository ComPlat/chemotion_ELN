class AddWellColorCode < ActiveRecord::Migration[5.2]
  def change
    add_column :wells, :color_code, :string, null: true
  end
end
