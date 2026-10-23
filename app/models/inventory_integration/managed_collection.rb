# frozen_string_literal: true

module InventoryIntegration
  # A collection an admin made an inventory: its samples are chemicals, and its shares carry
  # per-field inventory access. The collection keeps its person owner.
  class ManagedCollection < ApplicationRecord
    belongs_to :collection, class_name: '::Collection'
    belongs_to :created_by, class_name: '::User'
    has_one :connection, -> { where(archived_at: nil) }, class_name: 'InventoryIntegration::Connection',
                                                         inverse_of: :managed_collection,
                                                         dependent: :restrict_with_exception

    scope :active, -> { where(archived_at: nil) }

    validates :collection_id, uniqueness: true
    validate :collection_assignable, on: :create

    def self.inventory?(collection_id)
      active.exists?(collection_id: collection_id)
    end

    def archived?
      archived_at.present?
    end

    # Flags the samples already in the collection; the collections_samples trigger flags later ones.
    def mark_inventory_samples!
      ::Sample.joins(:collections_samples)
              .where(collections_samples: { collection_id: collection_id, deleted_at: nil })
              .where.not(inventory_sample: true)
              .update_all(inventory_sample: true) # rubocop:disable Rails/SkipsModelValidations
    end

    private

    def collection_assignable
      return if collection.nil?

      errors.add(:collection, 'is a system collection') if collection.is_locked
      errors.add(:collection, 'must belong to a person') unless collection.user.is_a?(::Person)
    end
  end
end
