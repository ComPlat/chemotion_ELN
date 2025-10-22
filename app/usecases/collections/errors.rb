# frozen_string_literal: true

module Usecases
  module Collections
    module Errors
      class UpdateForbidden < StandardError; end
      class InsufficientPermissionError < StandardError; end
    end
  end
end
