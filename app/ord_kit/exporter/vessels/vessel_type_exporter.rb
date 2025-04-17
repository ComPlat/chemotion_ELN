# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class VesselTypeExporter < OrdKit::Exporter::Base
        def to_ord
          OrdKit::VesselTemplate::VesselType.const_get model.vessel_type.upcase.to_s
        rescue NameError
          OrdKit::VesselTemplate::VesselType::UNSPECIFIED
        end
      end
    end
  end
end
