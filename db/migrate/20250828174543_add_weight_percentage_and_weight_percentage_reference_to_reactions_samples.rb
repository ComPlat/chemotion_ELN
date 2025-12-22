class AddWeightPercentageAndWeightPercentageReferenceToReactionsSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions_samples, :weight_percentage_reference, :boolean, null: true, default: false
    add_column :reactions_samples, :weight_percentage, :float, null: true, default: nil
  end
end
