# frozen_string_literal: true

module OrdKit
  module Exporter
    module Compounds
      class Base
        # Provides empty implementation activity_type_attributes which needs to be implemented in subclasses.
        def initialize(action)
          @action = action
        end

        delegate :workup, to: :action

        def to_ord
          OrdKit::Compound.new(
            identifiers: identifiers,
            amount: amount,
            percentage: percentage,
            reaction_role: reaction_role,
            preparations: preparations,
            source: compound_source,
            features: nil,
            analyses: nil,
            purity: purity,
            is_waterfree_solvent: workup['is_waterfree_solvent'],
            location: workup['location'],
          )
        end

        private

        attr_reader :action

        def identifiers
          nil
        end

        def amount
          nil
        end

        def percentage
          nil
        end

        def reaction_role
          nil
        end

        def preparations
          nil
        end

        def compound_source
          nil
        end

        def purity
          OrdKit::Percentage.new(
            value: (action.sample&.purity || 1) * 100,
          )
        end
      end
    end
  end
end
