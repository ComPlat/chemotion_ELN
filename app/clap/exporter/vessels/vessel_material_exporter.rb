# frozen_string_literal: true

module Clap
  module Exporter
    module Vessels
      class VesselMaterialExporter < Clap::Exporter::Base
        def to_clap
          Clap::Material.new(type: material_type, details: model.material_details)
        end

        def material_type
          Material::MaterialType.const_get model.material_type.upcase.to_s
        rescue NameError
          Material::MaterialType::UNSPECIFIED
        end
      end
    end
  end
end
