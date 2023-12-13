# frozen_string_literal: true

module OrdKit
  module Exporter
    module Reactions
      class ReactionEnvironmentExporter < OrdKit::Exporter::Base
        def to_ord
          # TODO: Environment NYI in ELN/RPE.
          nil

          # OrdKit::ReactionSetup::ReactionEnvironment.new(
          #   details: model.environment['details'],
          #   type: reaction_environment,
          # )
        end

        private

        def reaction_environment
          OrdKit::ReactionSetup::ReactionEnvironment::ReactionEnvironmentType.const_get(
            model.environment['environment_type'],
          )
        rescue StandardError
          OrdKit::ReactionSetup::ReactionEnvironment::ReactionEnvironmentType::UNSPECIFIED
        end
      end
    end
  end
end
