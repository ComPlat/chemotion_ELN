class AddSolventToSamples < ActiveRecord::Migration[4.2]
  def change
    rename_column :samples, :solvent, :deprecated_solvent
    add_column :samples, :solvent, :string

    Sample.where(solvent: [nil, '']).where.not(deprecated_solvent: [nil, '']).find_each do |item|
      solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| item.deprecated_solvent&.include?(s[:label]) }
      new_sol = solvent ? [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '1' }].to_json : nil
      item.update_columns(solvent: new_sol)
    end
  end
end
