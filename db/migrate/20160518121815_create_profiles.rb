class CreateProfiles < ActiveRecord::Migration[4.2]
  def change
    create_table :profiles do |t|
      t.boolean :show_external_name, default: false
      t.integer :user_id, null: false, index: true
      t.datetime :deleted_at, index: true
      t.timestamps null: false
    end
  end
end
