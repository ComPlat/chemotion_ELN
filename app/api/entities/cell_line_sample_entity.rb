# frozen_string_literal: true

module Entities
  class CellLineSampleEntity < ApplicationEntity
    expose :id
    expose! :can_copy
    expose :amount
    expose :passage
    expose :contamination
    expose :name
    expose :short_label
    expose :description
    expose :unit
    expose :cellline_material
    expose :tag
    expose :container, using: 'Entities::ContainerEntity'
  end
end
