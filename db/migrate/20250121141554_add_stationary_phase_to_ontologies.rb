class AddStationaryPhaseToOntologies < ActiveRecord::Migration[6.1]
  def change
    add_column :ontologies, :stationary_phase, :string, array: true
    remove_column :ontologies, :device_code, :string
    remove_column :ontology_device_methods, :device_code, :string
  end
end
