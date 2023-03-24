class CreateVessels < ActiveRecord::Migration[6.1]
  def change
    create_table :vessels do |t|
      t.integer :user_id
      t.string :name
      t.integer :created_by
      t.timestamps
      t.datetime :deleted_at
      t.string :vessel_type
      t.string :material
      t.float :volume
      t.text :description
      t.string :short_label
    end
  end
end
