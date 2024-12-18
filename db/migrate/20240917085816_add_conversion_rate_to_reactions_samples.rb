class AddConversionRateToReactionsSamples < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions_samples, :conversion_rate, :float, null: true
  end
end
