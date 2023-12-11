class AddOntologiesToDeviceDescriptions < ActiveRecord::Migration[6.1]
  def change
    add_column :device_descriptions, :ontologies, :jsonb
  end
end
