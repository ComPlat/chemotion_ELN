class AddVesselTypeToReactionProcessVessels < ActiveRecord::Migration[6.1]
  def up
    add_column :reaction_process_vessels, :vesselable_type, :string
    rename_column :reaction_process_vessels, :vessel_id, :vesselable_id
    ReactionProcessEditor::ReactionProcessVessel.update_all("vesselable_type='Vessel'") # rubocop:disable Rails/SkipsModelValidations
  end

  def down
    rename_column :reaction_process_vessels, :vesselable_id, :vessel_id
    remove_column :reaction_process_vessels, :vesselable_type
  end
end
