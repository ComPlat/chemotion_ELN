# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      module Models
        class Vessels < Base
          def preparation_options
            { preparation_types: preparation_types, cleanup_types: cleanup_types }
          end

          def preparation_types
            # Subset of OrdKit::VesselPreparation::VesselPreparationType.constants
            titlecase_options_for %w[OVEN_DRIED FLAME_DRIED EVACUATED_BACKFILLED PURGED CUSTOM NONE]
          end

          def cleanup_types
            # Subset of OrdKit::VesselCleanup::VesselCleanupType.constants
            titlecase_options_for %w[WASTE REMOVE STORAGE]
          end
        end
      end
    end
  end
end
