class CreateUserLabels < ActiveRecord::Migration[4.2]
  def change
    create_table :user_labels do |t|
      t.integer :user_id
      t.string :title, null: false
      t.string :description, null: true
      t.string :color, null: false
      t.integer :access_level,     default: 0
      t.integer :position, default: 10
      t.datetime :created_at
      t.datetime :updated_at
      t.datetime :deleted_at
    end
  end

end
