# frozen_string_literal: true

module Entities
  # An inventory collection (InventoryIntegration::ManagedCollection) in the admin interface.
  class InventoryCollectionEntity < Grape::Entity
    expose :id, :collection_id, :archived_at, :created_at
    expose(:label) { |inventory| inventory.collection.label }
    expose(:owner_id) { |inventory| inventory.collection.user_id }
    # The owner's account may be soft-deleted.
    expose(:owner) do |inventory|
      owner = inventory.collection.user || ::User.with_deleted.find_by(id: inventory.collection.user_id)
      owner ? "#{owner.name} (#{owner.name_abbreviation})" : "##{inventory.collection.user_id}"
    end
    expose :connection do |inventory|
      connection = inventory.connection
      connection && { id: connection.id, name: connection.name, adapter_key: connection.adapter_key,
                      status: connection.status }
    end
  end
end
