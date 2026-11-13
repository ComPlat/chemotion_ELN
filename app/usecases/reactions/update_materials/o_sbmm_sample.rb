# frozen_string_literal: true

module Usecases
  module Reactions
    class UpdateMaterials
      # SBMM sample structure — nested UpdateMaterials helper (Zeitwerk).
      #
      # OpenStruct on purpose: the payload carries an open set of SBMM sample attributes from the
      # client; absent keys must read as nil and +to_h+ must return exactly the keys sent.
      # rubocop:disable Style/OpenStructUse
      class OSbmmSample < OpenStruct
        def initialize(data)
          data['show_label'] = false if data['show_label'].blank?
          super
        end

        # Named after the payload key +is_new+, which callers also set (+is_new=+).
        def is_new # rubocop:disable Naming/PredicatePrefix, Naming/PredicateMethod
          truthy?(super)
        end

        # UI may send booleans/strings; normalize once so association persistence is consistent.
        def reference # rubocop:disable Naming/PredicateMethod
          truthy?(super)
        end

        private

        def truthy?(value)
          value.to_s.match?(/^(true|t|yes|y|1)$/i)
        end
      end
      # rubocop:enable Style/OpenStructUse
    end
  end
end
