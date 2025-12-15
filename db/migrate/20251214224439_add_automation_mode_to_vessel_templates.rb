class AddAutomationModeToVesselTemplates < ActiveRecord::Migration[6.1]
  def change
    add_column :vessel_templates, :automation_modes, :string, array: true
  end
end
