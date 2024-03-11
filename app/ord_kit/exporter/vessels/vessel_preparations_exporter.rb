# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class VesselPreparationsExporter < OrdKit::Exporter::Base
        def to_ord
          return unless model

          model.map do |preparation|
            VesselPreparation.new(
              type: preparation_type(preparation),
              medium: nil,
              details: nil,
            )
          end
        end

        private

        def preparation_type(attachment)
          OrdKit::VesselPreparation::VesselPreparationType.const_get(attachment)
        rescue StandardError
          OrdKit::VesselPreparation::VesselPreparationType.UNSPECIFIED
        end
      end
    end
  end
end
