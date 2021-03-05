class AddSiRxnSettingsToReport < ActiveRecord::Migration[5.2]
  def change
    default_value = {
      "Name" => true,
      "CAS" => true,
      "Formula" => true,
      "Smiles" => true,
      "InCHI" => true,
      "Molecular Mass" => true,
      "Exact Mass" => true,
      "EA" => true
    }
    add_column :reports, :si_reaction_settings, :json, default: default_value
  end
end
