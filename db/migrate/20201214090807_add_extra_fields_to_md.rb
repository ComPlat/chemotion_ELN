class AddExtraFieldsToMd < ActiveRecord::Migration[4.2]
  def change
    add_column :device_metadata, :data_cite_state, :string, default: 'draft'
    add_column :device_metadata, :data_cite_creator_name, :string
  end
end
