# frozen_string_literal: true

module InventoryIntegration
  # Which groups of inventory fields a user may see or edit on samples of inventory collections.
  # Each share stores a group => level map in collection_shares.inventory_field_access; NULL means
  # the default of the share's permission level.
  module FieldAccess
    LEVELS = %w[hidden read edit].freeze
    GROUPS = {
      # Never hidden: safety information (GefStoffV par. 6(12)).
      'substance_safety' => {
        levels: %w[read edit], keys: %w[safetyPhrases safetySheetPath sdsExtractedProperties disposal_info],
        key_pattern: /_link\z/
      },
      'stock' => {
        levels: LEVELS,
        keys: %w[amount volume status expiration_date delivery_date opening_date storage_temperature],
        sample_columns: %w[real_amount_value real_amount_unit target_amount_value target_amount_unit],
      },
      'location' => {
        levels: LEVELS,
        keys: %w[host_building host_room host_cabinet current_building current_room current_cabinet],
        sample_columns: %w[location],
      },
      'procurement' => {
        levels: LEVELS,
        keys: %w[vendor order_number product_number price ordered_date required_date required_by vendor_info],
        key_pattern: /ProductInfo\z/,
      },
      'people' => { levels: %w[hidden read], keys: %w[host_owner host_group current_group person borrowed_by] },
      'notes' => { levels: LEVELS, keys: %w[important_notes] },
      'link' => { levels: %w[hidden read], keys: [] },
    }.freeze
    FULL = GROUPS.transform_values { |group| group[:levels].last }.freeze
    NONE = GROUPS.transform_values { |group| group[:levels].first }.freeze
    ROLE_DEFAULTS = {
      'user' => { 'stock' => 'edit', 'location' => 'read', 'procurement' => 'read', 'notes' => 'edit',
                  'link' => 'read' },
      'partner' => { 'stock' => 'edit', 'location' => 'read', 'notes' => 'edit', 'link' => 'read' },
      'collaborator' => { 'stock' => 'read' },
      'reviewer' => {
        'stock' => 'read', 'location' => 'read', 'procurement' => 'read', 'notes' => 'read', 'link' => 'read'
      },
      'supervisor' => FULL,
    }.transform_values { |grants| NONE.merge(grants).freeze }.freeze

    class << self
      # The role whose defaults a share without its own map gets, by permission level.
      def default_role(permission_level)
        if permission_level >= CollectionShare.permission_level(:manage_shares) then 'supervisor'
        elsif permission_level >= CollectionShare.permission_level(:remove_elements) then 'user'
        elsif permission_level >= CollectionShare.permission_level(:edit_elements) then 'partner'
        else 'reviewer'
        end
      end

      # @return [Array<String>] problems of a map given for a share; empty when valid
      def errors(map)
        return ['must be a mapping of field groups to levels'] unless map.is_a?(Hash)

        map.filter_map do |group, level|
          definition = GROUPS[group.to_s]
          next "unknown field group '#{group}'" unless definition
          next if definition[:levels].include?(level)

          "#{group} must be one of #{definition[:levels].join(', ')}"
        end
      end

      # Every group present; groups left out are hidden, as far as the group allows.
      def normalize(map)
        NONE.merge(map.to_h.stringify_keys.slice(*GROUPS.keys))
      end

      # The access a share grants, capped by its permission level: edit needs edit_elements.
      def for_share(share)
        map = normalize(share.inventory_field_access || ROLE_DEFAULTS[default_role(share.permission_level)])
        return map if share.permission_level >= CollectionShare.permission_level(:edit_elements)

        map.transform_values { |level| level == 'edit' ? 'read' : level }
      end

      # Effective access of +user+ to a sample, nil when the sample is in no inventory collection.
      # Membership is read from the database, not from a possibly stale association.
      def for(user, sample)
        effective(user, CollectionsSample.where(sample_id: sample.id).pluck(:collection_id))
      end

      def for_collection(user, collection)
        effective(user, [collection.id])
      end

      def group_of(key)
        key = key.to_s
        GROUPS.find do |_name, group|
          group[:keys].include?(key) || group[:key_pattern]&.match?(key)
        end&.first
      end

      private

      def effective(user, collection_ids)
        inventories = InventoryIntegration::ManagedCollection.active.where(collection_id: collection_ids)
        return nil if inventories.empty?

        inventory_ids = inventories.pluck(:collection_id)
        access = unrestricted?(user, inventory_ids) ? FULL : shared_access(user, inventory_ids)
        cap_external(access,
                     InventoryIntegration::Connection.current.where(managed_collection_id: inventories.select(:id)))
      end

      # Only shares of the inventory collections count: another collection holding the sample,
      # owned or shared, never widens access.
      def shared_access(user, inventory_ids)
        grants = CollectionShare.shared_with(user).where(collection_id: inventory_ids).map { |share| for_share(share) }
        grants.reduce(NONE) { |union, grant| most_permissive(union, grant) }
      end

      # The owner of an inventory collection holding the sample, and admins, see and edit everything.
      def unrestricted?(user, inventory_ids)
        user.is_a?(Admin) || ::Collection.exists?(id: inventory_ids, user_id: user.id)
      end

      def most_permissive(left, right)
        left.merge(right) { |_group, mine, theirs| LEVELS.index(mine) >= LEVELS.index(theirs) ? mine : theirs }
      end

      # Fields the external system owns are never edited in Chemotion.
      def cap_external(access, connections)
        external = connections.flat_map(&:external_groups)
        access.to_h { |group, level| [group, level == 'edit' && external.include?(group) ? 'read' : level] }
      end
    end
  end
end
