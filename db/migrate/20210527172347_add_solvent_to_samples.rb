class AddSolventToSamples < ActiveRecord::Migration[4.2]
  def change
    rename_column :samples, :solvent, :deprecated_solvent
    add_column :samples, :solvent, :string

    Sample.where(solvent: [nil, '']).where.not(deprecated_solvent: [nil, '']).find_each do |item|
      solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(item.deprecated_solvent) }
      item.update_columns(solvent: [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '1' }.to_json])
    end
  end
end
