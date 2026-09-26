class RenameMobilePhasesInOntologyDeviceMethods < ActiveRecord::Migration[6.1]
  def change
    rename_column :ontology_device_methods, :mobile_phases, :mobile_phase
    rename_column :ontology_device_methods, :stationary_phases, :stationary_phase
  end
end
