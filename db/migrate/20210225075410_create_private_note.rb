class CreatePrivateNote < ActiveRecord::Migration[5.2]
  def change
    create_table :private_notes do |t|
      t.string :content
      t.integer :created_by, null: false
      t.datetime :created_at, null: false
      t.datetime :updated_at, null: false
      t.integer :noteable_id
      t.string :noteable_type
    end

    add_index :private_notes, :created_by, name: 'index_private_note_on_user'
    add_index :private_notes, [:noteable_type, :noteable_id]
  end
end
