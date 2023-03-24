# frozen_string_literal: true

module Entities
  class VesselEntity < ApplicationEntity

    expose! :id
    expose! :name
    expose! :vessel_type
    expose! :material
    expose! :volume
    expose! :description
    expose! :short_label
    expose! :type

    expose_timestamps

    def type
      'vessel'
    end
  end
end
