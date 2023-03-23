class RemoveMigratedScanDataFromSampleTask < ActiveRecord::Migration[6.1]
  def change
    rename_column(:sample_tasks, :measurement_value, :result_value)
    rename_column(:sample_tasks, :measurement_unit, :result_unit)
    remove_columns(:sample_tasks, :additional_note, :private_note, type: :string)
    add_column(:sample_tasks, :required_scan_results, :integer, default: 1, null: false)
  end
end
