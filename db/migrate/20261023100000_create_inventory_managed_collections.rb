# frozen_string_literal: true

class CreateInventoryManagedCollections < ActiveRecord::Migration[6.1]
  def change
    create_table :inventory_managed_collections do |t|
      t.references :collection, type: :integer, null: false, foreign_key: true, index: { unique: true }
      t.jsonb :settings, null: false, default: {}
      t.references :created_by, type: :integer, null: false, foreign_key: { to_table: :users }
      t.datetime :archived_at
      t.timestamps
    end
  end
end
