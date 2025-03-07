# frozen_string_literal: true

module Chemotion
  class InventoryAPI < Grape::API
    resource :inventory do
      namespace :update_inventory_label do
        desc 'update inventory label for collection'
        params do
          requires :prefix, type: String
          requires :name, type: String
          requires :counter, type: Integer
          requires :collection_ids, type: Array[Integer]
        end
        put do
          collection_ids = params[:collection_ids]
          begin
            Inventory.create_or_update_inventory_label(
              params[:prefix],
              params[:name],
              params[:counter],
              collection_ids,
              current_user.id,
            )
          rescue StandardError => e
            error!({ error_type: e.class.name, error_message: e.message }, 500)
          end
        end
      end

      namespace :user_inventory_collections do
        desc 'get inventories and collections for user'
        get do
          {
            inventory_collections: Collection.inventory_collections(current_user.id),
          }
        end
      end

      route_param :collection_id do
        desc 'get inventory label and counter for a collection'
        get do
          inventory = Inventory.by_collection_id(params[:collection_id]).first
          present inventory, with: Entities::InventoryEntity
        rescue ActiveRecord::RecordNotFound => e
          error!({ error: e.message }, 404)
        end
      end
    end
  end
end
