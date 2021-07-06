class AddMolSerialsToReport < ActiveRecord::Migration[4.2]
  def change
    add_column :reports, :mol_serials, :text, default: [].to_yaml
  end
end
