# frozen_string_literal: true

module Usecases
  module Reactions
    class UpdateMaterials
      # Sample structure — nested UpdateMaterials helper (Zeitwerk).
      #
      # OpenStruct on purpose: the payload carries an open set of sample attributes from the
      # client; absent keys must read as nil and +to_h+ must return exactly the keys sent.
      # rubocop:disable Style/OpenStructUse
      class OSample < OpenStruct
        NESTED_ATTRIBUTES = %w[residues elemental_compositions].freeze

        def initialize(data)
          nest_attributes(data)
          data['elemental_compositions_attributes']&.each { |i| i.delete('description') }
          data['show_label'] = false if data['show_label'].blank?
          super
        end

        # Named after the payload key +is_new+, which callers also set (+is_new=+).
        def is_new # rubocop:disable Naming/PredicatePrefix, Naming/PredicateMethod
          truthy?(super)
        end

        private

        # Moves +residues+ / +elemental_compositions+ to their +*_attributes+ keys, without ids.
        def nest_attributes(data)
          NESTED_ATTRIBUTES.each do |prop|
            prop_value = data.delete(prop) || []
            prop_value.each { |i| i.delete :id }
            next if prop_value.blank?

            data.merge!("#{prop}_attributes" => prop_value)
          end
        end

        def truthy?(value)
          value.to_s.match?(/^(true|t|yes|y|1)$/i)
        end
      end
      # rubocop:enable Style/OpenStructUse
    end
  end
end
