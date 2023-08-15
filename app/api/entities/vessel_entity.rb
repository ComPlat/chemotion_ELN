# frozen_string_literal: true

module Entities
  class VesselEntity < Grape::Entity
    expose :id
    expose :name
    expose :description
    expose :vessel_template, using: 'Entities::VesselTemplateEntity'
  end
end
