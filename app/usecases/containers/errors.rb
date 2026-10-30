# frozen_string_literal: true

module Usecases
  module Containers
    module Errors
      # Raised when the root of a saved container tree does not resolve to an element the current
      # user may update (including a missing or rootless root). The API maps it to 403.
      class Unauthorized < StandardError; end
    end
  end
end
