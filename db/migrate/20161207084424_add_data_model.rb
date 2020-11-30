class AddDataModel < ActiveRecord::Migration[4.2]
  def up
    create_table :containers do |t|
      t.string :ancestry, index: true
      t.integer :containable_id
      t.string :containable_type
      t.string :name
      t.string :container_type
      t.text :description
      t.hstore :extended_metadata, default: ''

      t.timestamps null: false
    end

    create_table :attachments do |t|
      t.integer :container_id
      t.string :filename, null: false
      t.string :identifier, null: false
      t.string :checksum, null: false
      t.string :storage, null: false
      t.integer :created_by, null: false
      t.integer :created_for
      t.integer :version, null: false

      t.timestamps null: false
    end
  end

  def down
    drop_table :containers
    drop_table :attachments
  end
end
