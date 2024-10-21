# frozen_string_literal: true

module Entities
  class VesselInstanceEntity < Grape::Entity
    expose :id
    expose :name
    expose :short_label
    expose :description
    expose :vessel_template
    expose :bar_code
    expose :qr_code
    # expose :container, using: 'Entities::ContainerEntity'
  end
end
