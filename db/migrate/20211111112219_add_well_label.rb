class AddWellLabel < ActiveRecord::Migration[5.2]
  def change
    add_column :wells, :label, :string, null: false, default: 'Molecular structure'
  end
end
