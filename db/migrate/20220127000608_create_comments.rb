class CreateComments < ActiveRecord::Migration[5.2]
  def change
    create_table :comments do |t|
      t.string :content
      t.integer :created_by, null: false
      t.string :section
      t.string :status, default: "Pending"
      t.string :submitter
      t.string :resolver_name
      t.integer :commentable_id
      t.string :commentable_type

      t.timestamps
    end
    add_index :comments, :created_by, name: "index_comments_on_user"
    add_index :comments, :section, name: "index_comments_on_section"
    add_index :comments, [:commentable_type, :commentable_id]
  end
end
