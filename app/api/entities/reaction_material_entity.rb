# frozen_string_literal: true

module Entities
  # wraps a ReactionsSample object
  class ReactionMaterialEntity < ApplicationEntity
    # important: unexpose gas_type, gas_phase_data and weight_percentage first to avoid conflict
    expose! :sample, using: 'Entities::SampleEntity', merge: true do
      unexpose :gas_type
      unexpose :gas_phase_data
      unexpose :weight_percentage
    end

    expose! :coefficient
    expose! :equivalent
    expose! :position
    expose! :reference
    expose! :show_label
    expose! :waste
    expose! :gas_type
    expose! :gas_phase_data
    expose! :conversion_rate
    expose! :weight_percentage_reference
    expose! :weight_percentage
    expose! :intermediate_type
  end
end
