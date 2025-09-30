# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  # Used by `/vessels/names/all` to reduce query overhead
  class VesselTemplateBasicEntity < Grape::Entity
    expose :name
    expose :vessel_type
    expose :material_type
    expose :material_details
    expose :volume_amount
    expose :volume_unit
    expose :details
    expose :id
  end
end
