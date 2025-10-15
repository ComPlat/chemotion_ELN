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
        Versioning::Serializers::CelllineSampleSerializer.call(cellline_sample)
      end
    end
  end
end
