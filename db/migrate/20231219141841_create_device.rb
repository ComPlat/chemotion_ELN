class CreateDevice < ActiveRecord::Migration[6.1]
  def change
    create_table :devices do |t|
      t.string :name
      t.string :name_abbreviation
      t.string :first_name
      t.string :last_name
      t.string :email
      t.string :encrypted_password
      t.string :serial_number
      t.string :verification_status, default: 'none'
      t.boolean :account_active
      t.boolean :visibility, default: false
      t.jsonb :novnc_settings, default: {}
      t.jsonb :datacollector_config, default: {}
      t.datetime :deleted_at
      t.timestamps
    end
    add_index :devices, :email, unique: true
    add_index :devices, :name_abbreviation, unique: true, where: 'name_abbreviation IS NOT NULL'
    add_index :devices, :deleted_at
  end
end
