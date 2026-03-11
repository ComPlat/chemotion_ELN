# frozen_string_literal: true

module Clap
  module Exporter
    class Base
      def initialize(model)
        @model = model
      end

      private

      attr_reader :model

      def ontology_ord(ontology_id)
        Clap::Exporter::Models::OntologyExporter.new(ontology_id).to_clap
      end
    end
  end
end
