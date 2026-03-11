# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselPreparationsExporter < Clap::Exporter::Base
        def to_clap
          model ||= ['NONE']

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
          Clap::VesselPreparation::VesselPreparationType.const_get(attachment)
        rescue StandardError
          Clap::VesselPreparation::VesselPreparationType.UNSPECIFIED
        end
      end
    end
  end
end
