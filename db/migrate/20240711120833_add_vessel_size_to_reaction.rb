class AddVesselSizeToReaction < ActiveRecord::Migration[6.1]
  def change
    add_column :reactions, :vessel_size, :jsonb, null: true, default: { 'unit' => 'ml', 'amount' => nil }
  end
end
