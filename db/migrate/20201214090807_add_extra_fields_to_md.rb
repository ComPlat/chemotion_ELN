class AddExtraFieldsToMd < ActiveRecord::Migration
  def change
    add_column :device_metadata, :data_cite_state, :string, default: 'draft'
    add_column :device_metadata, :data_cite_creator_name, :string
  end
end
