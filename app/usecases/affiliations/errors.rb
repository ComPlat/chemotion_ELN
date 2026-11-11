# frozen_string_literal: true

module Usecases
  module Affiliations
    module Errors
      class DuplicateAffiliation < StandardError; end
      class NotInRegistry < StandardError; end
      class CountryNotInRegistry < NotInRegistry; end
    end
  end
end
