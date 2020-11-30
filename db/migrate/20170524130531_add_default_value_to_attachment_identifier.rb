class AddDefaultValueToAttachmentIdentifier < ActiveRecord::Migration[4.2]
  def self.up
    change_column :attachments, :identifier, :string , null: true, unique: true
    change_column :attachments, :identifier, 'uuid USING uuid(attachments.identifier)'
    change_column_default :attachments, :identifier, 'uuid_generate_v4()'

    change_column :attachments, :version, :integer, default: 0, null: true
    change_column :attachments, :checksum, :string, null: true
    change_column :attachments, :storage, :string, limit: 20, null: true, default: 'tmp'
    change_column :attachments, :filename, :string, null: true


    add_column :attachments, :content_type, :string
    add_column :attachments, :bucket, :string
    add_column :attachments, :key, :string , limit: 500
    add_column :attachments, :thumb, :boolean, default: false

    add_index :attachments, :identifier, unique: true
  end

  def self.down
    change_column :attachments, :identifier, 'varchar(255) USING concat(attachments.identifier)'#,  null: false
    change_column :attachments, :version, :integer, null: false
    change_column :attachments, :checksum, :string, null: false
    change_column :attachments, :storage, :string, null: false
    change_column :attachments, :filename, :string, null: false
    change_column_default :attachments, :version, nil
    change_column_default :attachments, :storage, nil
    change_column_default :attachments, :identifier, nil

    remove_column :attachments, :content_type
    remove_column :attachments, :bucket
    remove_column :attachments, :key
    remove_column :attachments, :thumb
  end
end
