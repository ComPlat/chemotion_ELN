# frozen_string_literal: true

module Resolvers
  class SampleResolver < BaseResolver
    argument :id, ID, required: true

    def resolve(id:)
      Sample.find_by!(id: id)
    end
  end
end
