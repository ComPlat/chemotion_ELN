# frozen_string_literal: true

module Clap
  module Exporter
    module Samples
      class SampleInActionExporter
        def initialize(action)
          @action = action
        end

        def to_clap
          Clap::Sample.new(
            reaction_role: reaction_role,
            label: label,
            name: name,
            ontology: ontology,
            preparations: preparations,
            amount: amount,
            percentage: percentage,
            purity: purity,
            is_waterfree_solvent: waterfree_solvent,
            location: location,
          )
        end

        private

        attr_reader :action

        delegate :workup, to: :action

        def reaction_role
          Clap::ReactionRole::ReactionRoleType.const_get workup['acts_as'].to_s
        rescue NameError
          Clap::ReactionRole::ReactionRoleType::UNSPECIFIED
        end

        def label
          if action.sample
            action.sample.preferred_label || action.sample.short_label
          elsif action.medium
            action.medium.label
          elsif action.ontology
            action.ontology.label
          end
        end

        def name
          if action.sample
            action.sample.name
          elsif action.medium
            action.medium.name
          elsif action.ontology
            action.ontology.name
          end
        end

        def ontology
          return unless action.ontology

          Clap::Exporter::Models::OntologyExporter.new(action.ontology.ontology_id).to_clap
        end

        def amount
          Clap::Exporter::Metrics::AmountExporter.new(workup['target_amount']).to_clap
        end

        def percentage
          Clap::Exporter::Metrics::Amounts::PercentageExporter.new(
            { value: workup.dig('target_amount', 'percentage') }.stringify_keys,
          ).to_clap
        end

        def preparations
          [SamplePreparationsExporter.new(action).to_clap].compact
        end

        def purity
          value = (action.sample&.purity || 1) * 100
          Clap::Percentage.new(value: value)
        end

        def waterfree_solvent
          workup['is_waterfree_solvent']
        end

        def location
          action.sample&.location
        end
      end
    end
  end
end
