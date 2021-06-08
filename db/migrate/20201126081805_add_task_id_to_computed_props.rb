class AddTaskIdToComputedProps < ActiveRecord::Migration[4.2]
  def up
    add_column :computed_props, :task_id, :string
  end

  def down
    remove_column :computed_props, :task_id
  end
end
