# frozen_string_literal: true

module Entities
  class CellLineSampleEntity < Grape::Entity
    expose :id
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
    expose :type

    private

    def type
      'cell_line'
    end
  end
end
