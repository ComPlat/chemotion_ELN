# frozen_string_literal: true

module OrdKit
  module Exporter
    class Base
      def initialize(model)
        @model = model
      end

      private

      attr_reader :model

      def ontology_ord(ontology_id)
        OrdKit::Exporter::Models::OntologyExporter.new(ontology_id).to_ord
      end
    end
  end
end
