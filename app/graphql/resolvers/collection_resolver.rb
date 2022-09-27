# frozen_string_literal: true

module Resolvers
  class CollectionResolver < BaseResolver
    argument :id, ID, required: true

    def resolve(id:)
      Collection.find_by!(id: id)
    end
  end
end
