class AddMoreFieldsToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def up
    change_column :device_descriptions, :general_tags, :string, array: true, default: [], using: "(string_to_array(general_tags, ','))"
    add_column :device_descriptions, :version_identifier_type, :string
    add_column :device_descriptions, :helpers_uploaded, :boolean, default: false
    add_column :device_descriptions, :setup_descriptions, :jsonb
  end

  def down
    change_column :device_descriptions, :general_tags, :string, array: false, default: nil, using: "(array_to_string(general_tags, ','))"
    remove_column :device_descriptions, :version_identifier_type
    remove_column :device_descriptions, :helpers_uploaded
    remove_column :device_descriptions, :setup_descriptions
  end
end
