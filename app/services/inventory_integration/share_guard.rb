# frozen_string_literal: true

module InventoryIntegration
  # Checks a share written on an inventory collection: its field access must be valid and no wider
  # than the writer's own, and its sharees must be allowed by the connection's allowed_sharee_ids.
  class ShareGuard
    class Refused < StandardError; end

    def self.inventory?(collection)
      ManagedCollection.inventory?(collection.id)
    end

    def initialize(collection, actor:)
      @collection = collection
      @actor = actor
      @inventory = ManagedCollection.active.find_by(collection_id: collection.id)
    end

    # @param field_access [Hash, nil] the map being written, nil when the share keeps its own
    # @raise [Refused]
    def check!(sharee_ids:, field_access: nil)
      if @inventory.nil?
        refuse!('field access applies to inventory collections only') unless field_access.nil?
        return
      end

      check_field_access!(field_access) unless field_access.nil?
      check_sharees!(sharee_ids)
    end

    private

    def check_field_access!(field_access)
      problems = FieldAccess.errors(field_access)
      refuse!("field access: #{problems.join('; ')}") if problems.any?
      return if @collection.user_id == @actor.id

      own = FieldAccess.for_collection(@actor, @collection)
      above = FieldAccess.normalize(field_access).select do |group, level|
        FieldAccess::LEVELS.index(level) > FieldAccess::LEVELS.index(own.fetch(group))
      end
      refuse!("field access above your own: #{above.keys.join(', ')}") if above.any?
    end

    def check_sharees!(sharee_ids)
      connection = @inventory.connection
      return if connection.nil?

      refused = sharee_ids.reject { |id| connection.sharee_allowed?(id) }
      refuse!('the connection of this inventory does not allow sharing with these users or groups') if refused.any?
    end

    def refuse!(message)
      raise Refused, message
    end
  end
end
