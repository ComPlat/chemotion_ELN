# frozen_string_literal: true

module Usecases
  module AffiliationSuggestions
    module Errors
      # Raised when a user submits a suggestion that duplicates a pending one or
      # an entry already present in the affiliation registry.
      class DuplicateSuggestion < StandardError; end

      # Raised when approving or rejecting a suggestion that is no longer pending.
      class AlreadyProcessed < StandardError; end
    end
  end
end
