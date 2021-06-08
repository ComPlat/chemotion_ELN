class AddSomeFieldsToMetadata < ActiveRecord::Migration[4.2]
  def change
    add_column :device_metadata, :doi_sequence, :integer
    add_column :device_metadata, :data_cite_prefix, :string
    add_column :device_metadata, :data_cite_created_at, :datetime
    add_column :device_metadata, :data_cite_updated_at, :datetime
    add_column :device_metadata, :data_cite_version, :integer
    add_column :device_metadata, :data_cite_last_response, :jsonb, default: { }
  end
end
