# frozen_string_literal: true

module Usecases
  module Sbmm
    module Errors
      class ConflictError < StandardError
        attr_reader :sbmm, :conflicting_sbmm

        def initialize(sbmm:, conflicting_sbmm:)
          @sbmm = sbmm
          @conflicting_sbmm = conflicting_sbmm
          super(message)
        end
      end

      class CreateConflictError < ConflictError
        def to_h
          {
            error: {
              message: message,
              sbmm_data: sbmm,
              conflicting_sbmm_id: conflicting_sbmm.id,
            }
          }
        end

        def message
          "Could not create the new SBMM as another with the same data already exists"
        end
      end

      class UpdateConflictError < ConflictError
        def to_h
          {
            error: {
              message: message,
              sbmm_id: sbmm.id,
              conflicting_sbmm_id: conflicting_sbmm.id,
            }
          }
        end

        def message
          "Could not update SBMM #{sbmm.id} as it conflicts with SBMM #{conflicting_sbmm.id}"
        end
      end
    end
  end
end
