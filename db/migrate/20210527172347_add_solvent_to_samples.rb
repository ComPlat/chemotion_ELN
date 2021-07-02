class AddSolventToSamples < ActiveRecord::Migration
  def change
    rename_column :samples, :solvent, :deprecated_solvent
    add_column :samples, :solvent, :string

    Sample.where(solvent: [nil, '']).where.not(deprecated_solvent: [nil, '']).each do |item|
      solvent = Chemotion::SampleConst.solvents_smiles_options.find { |s| s[:label].include?(item.deprecated_solvent) }
      item.solvent = [{ label: solvent[:value][:external_label], smiles: solvent[:value][:smiles], ratio: '100' }.to_json]
      item.save!
    end
  end
end
