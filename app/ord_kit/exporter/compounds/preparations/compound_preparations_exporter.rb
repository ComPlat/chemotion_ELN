# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      module Preparations
        class CompoundPreparationsExporter < OrdKit::Exporter::Actions::Base
          def to_ord
            return unless samples_preparation

            OrdKit::CompoundPreparation.new(
              type: preparation_type,
              details: details,
              reaction_id: reaction_id,
              equipment: equipment,
            )
          end

          private

          def samples_preparation
            ReactionProcessEditor::SamplesPreparation.find_by(
              reaction_process: @action.reaction_process,
              sample: @action.sample,
            )
          end

          def preparation_type
            Array(samples_preparation&.preparations).map do |preparation|
              OrdKit::CompoundPreparation::PreparationType.const_get(preparation)
            end
          end

          def equipment
            Array(samples_preparation&.equipment).map do |equip|
              OrdKit::Equipment.new(
                type: OrdKit::Equipment::EquipmentType.const_get(equip),
                details: nil, # Currently not present in ELN Editor.
              )
            end
          end

          def details
            samples_preparation.details
          end

          def reaction_id
            nil # n/a. Used in original ORD for SYNTHESIZED compounds which we do not have in ELN.
          end
        end
      end
    end
  end
end
