class AddSiRxnSettingsToReport < ActiveRecord::Migration[4.2]
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
    }.to_s
    add_column :reports, :si_reaction_settings, :text, default: default_value
  end
end
