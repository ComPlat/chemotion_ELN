# frozen_string_literal: true

module Entities
  class VesselInstanceEntity < Grape::Entity
    expose :id
    expose :name
    expose :short_label
    expose :description
    # expose :bar_code
    expose :bar_code do |vessel|
      vessel.code_log&.value_sm
    end
    expose :qr_code
    expose :weight_amount
    expose :weight_unit
    expose :vessel_template, using: Entities::VesselTemplateEntity
    expose :tag
  end
end
