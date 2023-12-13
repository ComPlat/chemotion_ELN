# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class VesselPreparationsExporter < OrdKit::Exporter::Base
        def to_ord
          []
          # TODO: Not yet implemented.
          #   VesselPreparation.new(
          #     preparation_type: model.preparation_type,
          #     medium_type: model.medium_type,
          #     details: model.details,
          #   )
          #   nil # n/a. VesselPreparations unknown in ELN.
          # end
        end
      end
    end
  end
end
