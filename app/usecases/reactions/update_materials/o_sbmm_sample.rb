# frozen_string_literal: true

module Usecases
  module Reactions
    class UpdateMaterials
      # SBMM sample structure — nested UpdateMaterials helper (Zeitwerk).
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
