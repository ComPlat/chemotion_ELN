# frozen_string_literal: true

# Use case for creating or updating components for a given sample.
# Iterates through the provided components, finds or initializes each by sample and molecule_id,
# assigns attributes, and saves with validation.
module Usecases
  module Components
    class Create
      def initialize(sample, components)
        @sample = sample
        @sample_id = sample.id
        @components = components
      end

      def execute!
        # Calculate relative molecular weights for mixture samples before saving
        calculate_relative_molecular_weights

        @components.each do |component_params|
          molecule_id = component_params.dig(:component_properties, :molecule_id).to_i

          component = Component
                      .where("sample_id = ? AND CAST(component_properties ->> 'molecule_id' AS INTEGER) = ?",
                             @sample_id, molecule_id)
                      .first_or_initialize(sample_id: @sample_id)

          component.assign_attributes(
            name: component_params[:name],
            position: component_params[:position],
            component_properties: component_params[:component_properties],
          )
          component.save! # Will raise ActiveRecord::RecordInvalid if validation fails
        end
      end

      private

      def calculate_relative_molecular_weights
        # Only calculate for mixture samples
        return unless @sample.sample_type == Sample::SAMPLE_TYPE_MIXTURE

        # Get the total mass of the mixture sample in grams
        total_mixture_mass = (@sample.sample_details&.dig('total_mixture_mass_g') || 0.0).to_f
        return if total_mixture_mass <= 0

        @components.each do |component_params|
          component_properties = component_params[:component_properties]
          next unless component_properties

          amount_mol = component_properties[:amount_mol].to_f
          next if amount_mol <= 0

          # Calculate relative molecular weight: total mass (g) / amount mol (mol) = g/mol
          relative_mw = total_mixture_mass / amount_mol
          component_properties[:relative_molecular_weight] = relative_mw
        end
      end
    end
  end
end
