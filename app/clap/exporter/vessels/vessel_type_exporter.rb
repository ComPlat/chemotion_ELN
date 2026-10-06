# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselTypeExporter < Clap::Exporter::Base
        def to_clap
          Clap::VesselTemplate::VesselType.const_get model.vessel_type.upcase.to_s
        rescue NameError
          Clap::VesselTemplate::VesselType::UNSPECIFIED
        end
      end
    end
  end
end
