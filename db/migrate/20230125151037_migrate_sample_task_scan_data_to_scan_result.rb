class MigrateSampleTaskScanDataToScanResult < ActiveRecord::Migration[6.1]
  def up
    SampleTask.all.each do |task|
      next unless migrateable_data?(task)

      SampleTask.transaction do
        scan_result = ScanResult.create(
          position: 0,
          measurement_value: task.measurement_value,
          measurement_unit: task.measurement_unit,
          sample_task: task,
          note: task.description.presence
        )

        task.attachment.update(attachable: scan_result) if task.attachment
      end
    end
  end

  # This migration is not possible to roll back as SampleTasks with two ScanResults can not be converted back into
  # SampleTasks with a single result.

  private

  def migrateable_data?(task)
    return true if task.measurement_value || task.measurement_unit
  end
end
