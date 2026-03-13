# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselPreparationsExporter < Clap::Exporter::Base
        def to_clap
          preparations = model || ['NONE']

          preparations.map do |preparation|
            VesselPreparation.new(
              type: preparation_type(preparation),
            )
          end
        end

        private

        def preparation_type(preparation)
          Clap::VesselPreparation::VesselPreparationType.const_get(preparation)
        rescue StandardError
          Clap::VesselPreparation::VesselPreparationType.UNSPECIFIED
        end
      end
    end
  end
end
