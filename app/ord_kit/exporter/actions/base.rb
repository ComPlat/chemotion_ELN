# frozen_string_literal: true

module OrdKit
  module Exporter
    module Actions
      class Base
        # Defines base structure of ReactionProcessAction Export
        # Provides implementation for the common methods details, duration,
        # Provides empty implementation action_type_attributes which needs to be implemented in subclasses.
        def initialize(action)
          @action = action
        end

        delegate :workup, to: :@action

        def to_ord(starts_at:)
          OrdKit::ReactionProcessAction.new(
            {
              id: @action.id,
              description: description,
              position: position,
              start_time: start_time(starts_at),
              duration: duration,
              equipment: equipment,
              vessel_template: vessel_template,
              automation_status: automation_status,
              fractions: fractions,
              automation_ordinal: @action.automation_ordinal,
            }.merge(action_type_attributes),
          )
        end

        private

        # ORD attributes in order of ORD definition by convention (they are numbered).
        def description
          workup['description']
        end

        def position
          @action.position + 1
        end

        def start_time(starts_at)
          OrdKit::Exporter::Metrics::TimeSpanExporter.new(starts_at).to_ord
        end

        def duration
          OrdKit::Exporter::Metrics::TimeSpanExporter.new(workup['duration']).to_ord
        end

        def equipment
          return unless workup.dig('EQUIPMENT', 'value')

          workup.dig('EQUIPMENT', 'value').map do |equipment|
            OrdKit::Equipment.new(
              type: equipment_type(equipment),
              details: '', # Currently n/a in ELN.
            )
          end
        end

        def equipment_type(equipment)
          OrdKit::Equipment::EquipmentType.const_get(equipment)
        rescue NameError
          OrdKit::Equipment::EquipmentType::UNSPECIFIED
        end

        def automation_status
          OrdKit::AutomationStatus.const_get workup['AUTOMATION_STATUS'] || 'RUN'
        rescue NameError
          OrdKit::AutomationStatus::UNSPECIFIED
        end

        def vessel_template
          Vessels::ReactionProcessVesselableExporter.new(@action.reaction_process_vessel).to_ord
        end

        def fractions
          @action.workup['fractions']&.map(&:to_s) || []
        end

        def action_type_attributes
          raise 'OrdKit::Exporter::Actions::Base is abstract. Please subclass and provide an implementation.'
        end
      end
    end
  end
end
