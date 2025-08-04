class AddWeightToVessels < ActiveRecord::Migration[6.1]
  def change
    add_column :vessels, :weight_amount, :float
    add_column :vessels, :weight_unit, :string
  end
end
