class AddWasteToReactionsSample < ActiveRecord::Migration
  def change
    add_column :reactions_samples, :waste, :boolean, default: false
    add_column :reactions_samples, :coefficient, :float, default: 1.0
  end
end
