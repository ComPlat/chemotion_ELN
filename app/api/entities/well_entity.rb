# frozen_string_literal: true

module Entities
  class WellEntity < ApplicationEntity
    with_options(anonymize_below: 0) do
      expose! :id
      expose! :is_restricted
      expose! :position
      expose! :sample, using: 'Entities::SampleEntity'
      expose! :type
    end

    with_options(anonymize_below: 1) do
      expose! :readouts
    end

    with_options(anonymize_below: 10) do
      expose! :additive
      expose! :color_code
      expose! :label
    end

    private

    def is_restricted # rubocop:disable Naming/PredicateName
      detail_levels[Well] < 10
    end

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
