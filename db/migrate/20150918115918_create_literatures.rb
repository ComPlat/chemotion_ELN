class CreateLiteratures < ActiveRecord::Migration
  def change
    create_table :literatures do |t|
      t.integer :reaction_id, null: false, index: true
      t.string :title
      t.string :url
      t.timestamps null: false
    end
  end
end
