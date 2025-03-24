# frozen_string_literal: true

module Entities
  class VesselInstanceEntity < Grape::Entity
    expose :id
    expose :name
    expose :short_label
    expose :description
    expose :bar_code
    expose :qr_code
    expose :weight_amount
    expose :weight_unit
    expose :vessel_template
    expose :tag
    expose :container, using: 'Entities::ContainerEntity'
  end
end
