# frozen_string_literal: true

module Entities
  class ComponentEntity < Grape::Entity
    expose :id
    expose :name
    expose :position
    expose :sample_id
    expose :component_properties
    expose :created_at
    expose :updated_at
  end
end
