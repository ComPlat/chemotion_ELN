class AddMolSerialsToReport < ActiveRecord::Migration
  def change
    add_column :reports, :mol_serials, :text, default: []
  end
end
