class AddMaintenanceFieldsToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    add_column :device_descriptions, :maintenance_contract_available, :string
    add_column :device_descriptions, :maintenance_scheduling, :string
    add_column :device_descriptions, :contact_for_maintenance, :jsonb
    add_column :device_descriptions, :planned_maintenance, :jsonb
    add_column :device_descriptions, :consumables_needed_for_maintenance, :jsonb
    add_column :device_descriptions, :unexpected_maintenance, :jsonb
    add_column :device_descriptions, :measures_after_full_shut_down, :text
    add_column :device_descriptions, :measures_after_short_shut_down, :text
    add_column :device_descriptions, :measures_to_plan_offline_period, :text
    add_column :device_descriptions, :restart_after_planned_offline_period, :text
  end
end
