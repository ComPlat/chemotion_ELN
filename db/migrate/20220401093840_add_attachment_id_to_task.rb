class AddAttachmentIdToTask < ActiveRecord::Migration[5.2]
  change_table :scan_tasks do |t|
    t.change :measurement_value, :Float
  end

  def change
    add_reference :scan_tasks, :attachment, index: true 
  end
end
