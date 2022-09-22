# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class InventoryEntity < Grape::Entity
    expose :id, :inventoriable_id, :inventoriable_type
    # expose :inventory_parameters do |obj|
    #   obj['inventory_parameters']
    # end
    # expose :inventory_parameters,  documentation: {type: 'Entities::InventoryParameterEntity', is_array: true }
  end
end