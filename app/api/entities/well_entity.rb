# frozen_string_literal: true

module Entities
  class WellEntity < ApplicationEntity
    expose(
      :additive,
      :color_code,
      :id,
      :label,
      :position,
      :readouts,
      :type,
    )

    expose :sample, using: 'Entities::SampleEntity'

    def position
      { x: object.position_x, y: object.position_y }
    end

    def type
      'well'
    end

    def sample
      displayed_in_list? ? nil : object.sample
    end
  end
end
