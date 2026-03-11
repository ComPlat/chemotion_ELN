# frozen_string_literal: true

module Clap
  module Exporter
    module Samples
      class SamplePreparationsExporter
        def initialize(action)
          @action = action
        end

        def to_clap
          return unless samples_preparation

          Clap::SamplePreparation.new(
            type: preparation_type,
            details: details,
            equipment: equipment,
          )
        end

        private

        attr_reader :action

        def samples_preparation
          ::ReactionProcessEditor::SamplesPreparation.find_by(
            reaction_process: action.reaction_process,
            sample: action.sample,
          )
        end

        def preparation_type
          Array(samples_preparation&.preparations).map do |preparation|
            Clap::SamplePreparation::PreparationType.const_get(preparation)
          end
        end

        def equipment
          Array(samples_preparation&.equipment).map do |equip|
            Clap::Equipment.new(
              type: Clap::Equipment::EquipmentType.const_get(equip),
              details: nil,
            )
          end
        end

        def details
          samples_preparation.details
        end
      end
    end
  end
end
