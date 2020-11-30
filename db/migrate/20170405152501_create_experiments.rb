class CreateExperiments < ActiveRecord::Migration[4.2]
  def change
    create_table :experiments do |t|
      t.string :type, limit: 20
      t.string :name
      t.text :description
      t.string :status, limit: 20
      t.jsonb :parameter

      t.integer :user_id
      t.integer :device_id
      t.integer :container_id
      t.integer :experimentable_id
      t.string :experimentable_type

      t.string :ancestry
      t.integer :parent_id

      t.timestamps null: false
    end
  end
end
