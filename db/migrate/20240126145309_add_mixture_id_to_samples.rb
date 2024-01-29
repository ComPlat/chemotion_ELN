class AddMixtureIdToSamples < ActiveRecord::Migration[6.1]
  def change
    add_reference :samples, :mixture, foreign_key: { to_table: :samples }
    add_reference :samples, :micromolecule, foreign_key: { to_table: :samples }
  end
end
