# frozen_string_literal: true

module Usecases
  module Reactions
    class UpdateMaterials
      # SBMM Sample Structure
      # File-local helper of UpdateMaterials — nested here (was a top-level
      # OSbmmSample) so it is a proper
      # Usecases::Reactions::UpdateMaterials::OSbmmSample under the Zeitwerk
      # namespaced root (DEV_RAILS_UPGRADE_7-0.md §0a).
      class OSbmmSample < OpenStruct
        def initialize(data)
          data['show_label'] = false if data['show_label'].blank?
          super
        end

        def is_new
          to_boolean super
        end

        def reference
          # UI may send booleans/strings; normalize once so association persistence is consistent.
          to_boolean super
        end

        def to_boolean(string)
          !!string.to_s.match(/^(true|t|yes|y|1)$/i)
        end
      end
    end
  end
end
