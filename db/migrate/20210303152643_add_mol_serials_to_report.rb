class AddMolSerialsToReport < ActiveRecord::Migration[5.2]
  def change
    add_column :reports, :mol_serials, :text, default: [], array: true
  end
end
