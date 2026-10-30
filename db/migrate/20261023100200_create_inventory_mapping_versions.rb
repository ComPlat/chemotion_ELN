# frozen_string_literal: true

class CreateInventoryMappingVersions < ActiveRecord::Migration[6.1]
  def change
    create_table :inventory_mapping_versions do |t|
      t.references :connection, null: false, index: false, foreign_key: { to_table: :inventory_connections }
      t.integer :version, null: false
      t.string :status, null: false, default: 'draft'
      t.string :origin, null: false
      t.string :preset_key
      t.references :based_on_version, foreign_key: { to_table: :inventory_mapping_versions }
      t.jsonb :mapping, null: false
      t.jsonb :request_settings
      t.string :schema_version, null: false, default: 'v1'
      t.jsonb :validation_report
      t.string :llm_task
      t.string :llm_model
      t.references :created_by, type: :integer, null: false, foreign_key: { to_table: :users }
      t.references :accepted_by, type: :integer, foreign_key: { to_table: :users }
      t.datetime :accepted_at
      t.jsonb :log_data
      t.timestamps
    end

    add_index :inventory_mapping_versions, %i[connection_id version], unique: true
    add_index :inventory_mapping_versions, :connection_id, unique: true, where: "status = 'active'",
                                                           name: 'index_inventory_mapping_versions_one_active'
    add_check_constraint :inventory_mapping_versions,
                         "status IN ('draft', 'active', 'superseded', 'discarded')",
                         name: 'inventory_mapping_versions_status'
    add_check_constraint :inventory_mapping_versions, "origin IN ('manual', 'preset', 'assistant', 'import')",
                         name: 'inventory_mapping_versions_origin'
    add_check_constraint :inventory_mapping_versions,
                         "status <> 'active' OR (accepted_by_id IS NOT NULL AND accepted_at IS NOT NULL)",
                         name: 'inventory_mapping_versions_active_accepted'
    add_check_constraint :inventory_mapping_versions, "origin <> 'assistant' OR llm_task IS NOT NULL",
                         name: 'inventory_mapping_versions_assistant_task'
    add_foreign_key :inventory_connections, :inventory_mapping_versions, column: :active_mapping_version_id
    add_index :inventory_connections, :active_mapping_version_id
  end
end
