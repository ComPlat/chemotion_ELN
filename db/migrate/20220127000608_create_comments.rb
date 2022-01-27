class CreateComments < ActiveRecord::Migration[5.2]
  def change
    create_table :comments do |t|
      t.string :content
      t.integer :created_by, null: false
      t.integer :section
      t.integer :commentable_id
      t.string :commentable_type

      t.timestamps
    end
    add_index :comments, :created_by, name: 'index_comment_on_user'
    add_index :comments, [:commentable_type, :commentable_id]
  end
end
