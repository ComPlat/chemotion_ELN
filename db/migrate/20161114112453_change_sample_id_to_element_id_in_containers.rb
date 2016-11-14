class ChangeSampleIdToElementIdinContainers < ActiveRecord::Migration
  def change
    rename_column :containers, :sample_id, :element_id
  end
end
