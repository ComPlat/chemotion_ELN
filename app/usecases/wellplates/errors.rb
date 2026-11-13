# frozen_string_literal: true

module Usecases
  module Wellplates
    module Errors
      # Raised when a requested grid size would drop a well that still holds
      # data. See {Usecases::Wellplates::Resize}.
      class ResizeNotAllowedError < StandardError; end

      # Raised for a grid size that is out of bounds or internally inconsistent
      # (e.g. one dimension zero while the other is not).
      class InvalidDimensionsError < StandardError; end
    end
  end
end
