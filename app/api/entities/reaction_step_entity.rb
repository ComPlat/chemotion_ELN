# frozen_string_literal: true

module Entities
  class ReactionStepEntity < ApplicationEntity
    expose! :id
    expose! :position
    expose! :description
    expose! :conditions
    expose! :duration
    expose! :temperature
    expose! :ph_operator
    expose! :ph_value
    expose! :vessel_size
    expose! :volume
  end
end
