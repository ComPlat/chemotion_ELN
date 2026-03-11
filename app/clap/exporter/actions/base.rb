# frozen_string_literal: true

module Clap
  module Exporter
    module Actions
      class Base
        # Defines base structure of ReactionProcessAction Export
        # Provides implementation for the common methods details, duration,
        # Provides empty implementation action_type_attributes which needs to be implemented in subclasses.
        def initialize(action)
          @action = action
        end

        attr_reader :action

        delegate :workup, to: :action

        def to_clap(starts_at:)
          Clap::ReactionProcessAction.new(
            {
              id: @action.id,
              description: description,
              position: position,
              start_time: start_time(starts_at),
              duration: duration,
              equipment: equipment,
              vessel_template: vessel_template,
              automation_control: automation_control,
              consumed_fraction: consumed_fraction,
              automation_ordinal: @action.automation_ordinal,
              type: ontology_ord(workup['type']),
              subtype: ontology_ord(workup['subtype']),
              device: ontology_ord(workup['device']),
              method: workup['method'],
            }.merge(action_type_attributes),
          )
        end

        private

        def ontology_ord(ontology_id)
          Clap::Exporter::Models::OntologyExporter.new(ontology_id).to_clap
        end

        def automation_control
          Clap::Exporter::Models::AutomationControlExporter.new(action.workup['automation_control']).to_clap
        end

        # CLAP attributes in order of Clap definition by convention (they are numbered).
        def description
          workup['description']
        end

        def position
          @action.position + 1
        end

        def start_time(starts_at)
          Clap::Exporter::Metrics::TimeSpanExporter.new(starts_at).to_clap
        end

        def duration
          Clap::Exporter::Metrics::TimeSpanExporter.new(workup['duration']).to_clap
        end

        def equipment
          return unless workup.dig('EQUIPMENT', 'value')

          workup.dig('EQUIPMENT', 'value').map do |equipment|
            Clap::Equipment.new(
              type: equipment_type(equipment),
              details: '', # Currently n/a in ELN. # TODO: eliminate?
            )
          end
        end

        def equipment_type(equipment)
          Clap::Equipment::EquipmentType.const_get(equipment)
        rescue NameError
          Clap::Equipment::EquipmentType::UNSPECIFIED
        end

        def vessel_template
          Vessels::ReactionProcessVesselableExporter.new(@action.reaction_process_vessel).to_clap
        end

        def consumed_fraction
          Clap::Exporter::Samples::FractionExporter.new(@action.consumed_fraction).to_clap
        end

        def action_type_attributes
          raise 'Clap::Exporter::Actions::Base is abstract. Please subclass and provide an implementation.'
        end
      end
    end
  end
end
