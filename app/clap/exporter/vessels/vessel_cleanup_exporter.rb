# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselCleanupExporter < Clap::Exporter::Base
        def to_clap
          Clap::VesselCleanup.new(type: cleanup_type)
        end

        def cleanup_type
          Clap::VesselCleanup::VesselCleanupType.const_get model.cleanup.to_s
        rescue NameError
          Clap::VesselCleanup::VesselCleanupType::UNSPECIFIED
        end
      end
    end
  end
end
