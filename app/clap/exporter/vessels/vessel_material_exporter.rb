# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselMaterialExporter < Clap::Exporter::Base
        def to_clap
          model.material_type&.upcase
        end
      end
    end
  end
end
