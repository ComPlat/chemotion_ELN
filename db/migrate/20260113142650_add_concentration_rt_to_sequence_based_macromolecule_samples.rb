class AddConcentrationRtToSequenceBasedMacromoleculeSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :sequence_based_macromolecule_samples, :concentration_rt_value, :float
    add_column :sequence_based_macromolecule_samples, :concentration_rt_unit, :string, default: 'mol/L', null: false
  end
end
