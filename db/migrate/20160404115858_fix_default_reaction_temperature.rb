class FixDefaultReactionTemperature < ActiveRecord::Migration[4.2]
  def up
    change_column :reactions, :temperature, :string, default: "21.0 °C"
  end

  def down
    change_column :reactions, :temperature, :string, default: "21.0°C"
  end
end
