# frozen_string_literal: true

module Entities
  class VesselTemplateEntity < Grape::Entity
    expose :id
    expose :name
    expose :details
    expose :vessel_type
    expose :volume_unit
    expose :volume_amount
    expose :material_type
    expose :material_details
  end
end
