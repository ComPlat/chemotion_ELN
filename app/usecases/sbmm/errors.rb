# frozen_string_literal: true

module Usecases
  module Sbmm
    module Errors
      class ConflictError < StandardError
        attr_reader :original_sbmm, :requested_changes

        def initialize(original_sbmm:, requested_changes:)
          @original_sbmm = original_sbmm
          @requested_changes = requested_changes
          super(message)
        end
      end

      class SbmmUpdateNotAllowedError < ConflictError
        def to_h
          {
            error: {
              message: message,
              original_sbmm: original_sbmm,
              requested_changes: requested_changes,
            }
          }
        end

        def message
          "Your changes could not be saved, as this SBMM is used by other other users as well. \
            Please contact your ELN admin if you think that your data is of better quality."
        end
      end
    end
  end
end
