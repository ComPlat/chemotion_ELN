# frozen_string_literal: true

module OrdKit
  module Exporter
    module Materials
      class MaterialExporter < OrdKit::Exporter::Base
        def to_ord
          OrdKit::Material.new(
            type: type,
            details: nil,
          )
        end

        def type
          Material::MaterialType.const_get model.to_s
        rescue NameError
          Material::MaterialType::UNSPECIFIED
        end
      end
    end
  end
end
