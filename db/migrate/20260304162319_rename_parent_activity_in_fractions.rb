class RenameParentActivityInFractions < ActiveRecord::Migration[6.1]
  def change
    rename_column :fractions, :parent_activity_id, :parent_action_id
    rename_column :fractions, :consuming_activity_id, :consuming_action_id
  end
end
