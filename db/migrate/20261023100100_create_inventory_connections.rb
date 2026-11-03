# frozen_string_literal: true

class CreateInventoryConnections < ActiveRecord::Migration[6.1]
  def change
    create_table :inventory_connections do |t|
      t.references :managed_collection, null: false, index: false,
                                        foreign_key: { to_table: :inventory_managed_collections }
      t.string :adapter_key, null: false, index: true
      t.string :name, null: false
      t.string :base_url
      t.string :source_key, null: false
      t.string :scope_key, null: false
      t.jsonb :settings, null: false, default: {}
      t.text :credentials_ciphertext
      t.integer :credentials_key_version, limit: 2
      t.string :credentials_fingerprint, limit: 16
      t.string :credentials_ref
      t.bigint :active_mapping_version_id
      t.string :status, null: false, default: 'draft'
      t.boolean :pull_enabled, null: false, default: true
      t.boolean :push_enabled, null: false, default: false
      t.string :profile, null: false, default: 'standard'
      t.jsonb :field_authority, null: false, default: {}
      t.integer :allowed_sharee_ids, array: true
      t.boolean :dry_run_required, null: false, default: true
      t.datetime :last_test_at
      t.boolean :last_test_ok
      t.string :last_test_digest, limit: 64
      t.jsonb :last_test_report
      t.references :created_by, type: :integer, null: false, foreign_key: { to_table: :users }
      t.references :updated_by, type: :integer, foreign_key: { to_table: :users }
      t.integer :lock_version, null: false, default: 0
      t.datetime :archived_at
      t.jsonb :log_data
      t.timestamps
    end

    # One current connection per inventory (archived ones stay for the audit trail).
    add_index :inventory_connections, :managed_collection_id, unique: true, where: 'archived_at IS NULL',
                                                              name: 'index_inventory_connections_one_current'
    add_index :inventory_connections, %i[source_key scope_key], unique: true, where: 'archived_at IS NULL',
                                                                name: 'index_inventory_connections_on_source_and_scope'
  end
end
