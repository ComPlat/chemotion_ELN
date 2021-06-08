class AddShowLabelToReactionsSample < ActiveRecord::Migration[4.2]
  def change
    add_column :reactions_samples, :show_label, :boolean, default: false, null: false
  end
end
