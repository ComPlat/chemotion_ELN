# frozen_string_literal: true

module Usecases
  module Sbmm
    module Errors
      class UpdateConflictError < StandardError
        attr_reader :sbmm, :conflicting_sbmm

        def initialize(sbmm:, conflicting_sbmm:)
          @sbmm = sbmm
          @conflicting_sbmm = conflicting_sbmm
          super(message)
        end

        def to_h
          {
            message: message,
            sbmm_id: sbmm.id,
            conflicting_sbmm_id: conflicting_sbmm.id
          }
        end

        def message
          "Could not update SBMM #{sbmm.id} as it conflicts with SBMM #{conflicting_sbmm.id}"
        end
      end
    end
  end
end
