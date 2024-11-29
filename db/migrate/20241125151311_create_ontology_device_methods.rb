# frozen_string_literal: true

class CreateOntologyDeviceMethods < ActiveRecord::Migration[6.1]
  def change
    create_table :ontology_device_methods, id: :uuid do |t|
      t.uuid :ontology_id
      t.string :label
      t.string :device_code
      t.jsonb :detectors
      t.jsonb :mobile_phases, array: true, default: []
      t.jsonb :stationary_phases, array: true, default: []
      t.jsonb :default_inject_volume
      t.string :description
      t.jsonb :steps
      t.boolean :active, null: false, default: true

      t.timestamps
    end
  end
end
