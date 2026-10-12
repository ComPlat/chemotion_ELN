# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class ConditionsActionExporter < Base
        private

        def equipment
          return unless workup.dig('EQUIPMENT', 'value')

          workup['EQUIPMENT']['value'].map do |equipment|
            Clap::Equipment.new(
              type: equipment_type(equipment),
            )
          end
        end

        def action_type_attributes
          { conditions: conditions }
        end

        def conditions
          Clap::Exporter::Conditions::ReactionConditionsExporter.new(workup).to_clap
        end
      end
    end
  end
end
