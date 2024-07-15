# frozen_string_literal: true

module Entities
  module ReactionProcessEditor
    module SelectOptions
      class Vessels < Base
        def preparations
          { preparation_types: preparation_types }
        end

        def preparation_types
          titlecase_options_for OrdKit::VesselPreparation::VesselPreparationType.constants
        end
      end
    end
  end
end
