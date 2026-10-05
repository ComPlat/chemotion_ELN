# frozen_string_literal: true

module Versioning
  module Fetchers
    class CelllineSampleFetcher
      include ActiveModel::Model

      attr_accessor :cellline_sample

      def self.call(**args)
        new(**args).call
      end

      def call
        versions = Versioning::Serializers::CelllineSampleSerializer.call(cellline_sample)

        material = CelllineMaterial.with_deleted.with_log_data.find_by(id: cellline_sample.cellline_material_id)
        versions += Versioning::Serializers::CelllineMaterialSerializer.call(material) if material

        versions
      end
    end
  end
end
