
module Entities
  # Publish-Subscription Entities
  class VesselTemplateEntity < Grape::Entity
    expose :name
    expose :vessel_type
    expose :material_type
    expose :volume_amount
    expose :volume_unit
    expose :id
  end
end
