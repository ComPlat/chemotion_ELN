# frozen_string_literal: true

class CreateOntologies < ActiveRecord::Migration[6.1]
  def change
    create_table :ontologies, id: :uuid do |t|
      t.string :chmo_id
      t.string :device_code
      t.string :name
      t.string :label
      t.string :link
      t.jsonb :roles, default: {}
      t.string :detectors, array: true, default: []
      t.string :solvents, array: true, default: []
      t.boolean :active, null: false, default: true

      t.timestamps
    end
  end
end
