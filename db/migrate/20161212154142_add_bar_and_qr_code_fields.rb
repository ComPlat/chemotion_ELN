class AddBarAndQrCodeFields < ActiveRecord::Migration[4.2]
  def change
    add_column :samples, :bar_code, :string
    add_column :samples, :qr_code, :string
    add_column :reactions, :bar_code, :string
    add_column :reactions, :qr_code, :string
    add_column :wellplates, :bar_code, :string
    add_column :wellplates, :qr_code, :string
    add_column :screens, :bar_code, :string
    add_column :screens, :qr_code, :string
  end
end
