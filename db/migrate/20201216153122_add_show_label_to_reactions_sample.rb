class AddShowLabelToReactionsSample < ActiveRecord::Migration
  def change
    add_column :reactions_samples, :show_label, :boolean, default: false, null: false
  end
end
