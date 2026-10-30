# frozen_string_literal: true

module Chemotion
  # Inventory field access for the share dialog of an inventory collection.
  class InventoryIntegrationAPI < Grape::API
    resource :inventory_integration do
      namespace :collections do
        route_param :collection_id, type: Integer do
          desc 'Field groups, levels and role defaults for the shares of a collection'
          get :field_access do
            collection = Collection.own_collections_for(current_user).find_by(id: params[:collection_id]) ||
                         Collection.shared_with_minimum_permission_level(
                           current_user, CollectionShare.permission_level(:manage_shares)
                         ).find_by(id: params[:collection_id])
            error!('Collection not found', 404) unless collection

            field_access = InventoryIntegration::FieldAccess
            inventory = InventoryIntegration::ManagedCollection.inventory?(collection.id)
            {
              inventory: inventory,
              groups: field_access::GROUPS.map { |key, group| { key: key, levels: group[:levels] } },
              role_defaults: field_access::ROLE_DEFAULTS,
              default_roles: CollectionShare::PERMISSION_LEVELS.values.index_with do |level|
                field_access.default_role(level)
              end,
              own_access: inventory ? field_access.for_collection(current_user, collection) : nil,
            }
          end
        end
      end
    end
  end
end
