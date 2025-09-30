# frozen_string_literal: true

module Entities
  # Publish-Subscription Entities
  class VesselTemplateEntity < Grape::Entity
    expose :name
    expose :vessel_type
    expose :material_type
    expose :material_details
    expose :volume_amount
    expose :volume_unit
    expose :details
    expose :id
    expose :container, using: 'Entities::ContainerEntity'
  end
end
