# frozen_string_literal: true

module Clap
  module Exporter
    module Models
      class DetectorExporter
        def initialize(detector_ontology_id:, conditions:)
          @detector_ontology_id = detector_ontology_id
          @conditions = conditions
        end

        def to_clap
          Clap::Detector.new(
            ontology: Clap::Exporter::Models::OntologyExporter.new(@detector_ontology_id).to_clap,
            conditions: Clap::Exporter::Conditions::ReactionConditionsExporter.new(@conditions).to_clap,
          )
        end
      end
    end
  end
end
