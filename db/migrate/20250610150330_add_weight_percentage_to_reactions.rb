class AddWeightPercentageToReactions < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :weight_percentage, :boolean, null: true, default: false
  end
end
