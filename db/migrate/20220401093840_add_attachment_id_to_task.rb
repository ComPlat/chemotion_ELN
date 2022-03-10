class AddAttachmentIdToTask < ActiveRecord::Migration[5.2]
  change_table :tasks do |t|
    t.change :measurement_value, :Float
  end

  def change
    add_reference :tasks, :attachment, index: true 
  end
end
