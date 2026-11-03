# frozen_string_literal: true

module Entities
  # A connection in the admin interface. Credentials are never exposed, only whether they are set.
  class InventoryConnectionEntity < Grape::Entity
    expose :id, :managed_collection_id, :adapter_key, :name, :base_url, :settings, :credentials_fingerprint,
           :credentials_ref, :status, :pull_enabled, :push_enabled, :profile, :field_authority,
           :allowed_sharee_ids, :dry_run_required, :active_mapping_version_id, :last_test_at, :last_test_ok,
           :last_test_report, :lock_version, :archived_at, :created_at, :updated_at
    expose(:collection_label) { |connection| connection.managed_collection.collection.label }
    expose(:credentials_set, &:credentials_set?)
    expose(:tested, &:tested?)
  end
end
