# frozen_string_literal: true

module OrdKit
  module Exporter
    module Vessels
      class VesselMaterialExporter < OrdKit::Exporter::Base
        def to_ord
          OrdKit::Material.new(type: material_type, details: model.material_details)
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
