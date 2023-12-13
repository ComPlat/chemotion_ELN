# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class ConditionsActionExporter < Base
        private

        def equipment
          return unless workup.dig('EQUIPMENT', 'value')

          workup['EQUIPMENT']['value'].map do |equipment|
            OrdKit::Equipment.new(
              type: equipment_type(equipment),
              details: '', # Currently n/a in ELN.
            )
          end
        end

        def action_type_attributes
          { conditions: conditions }
        end

        def conditions
          OrdKit::Exporter::Conditions::ReactionConditionsExporter.new(workup).to_ord
        end
      end
    end
  end
end
