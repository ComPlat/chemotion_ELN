class AddBarAndQrCodeToVessels < ActiveRecord::Migration[6.1]
  def change
    add_column :vessels, :bar_code, :string
    add_column :vessels, :qr_code, :string
  end
end
