# frozen_string_literal: true

module Types
  class QueryType < GraphQL::Schema::Object
    field :sample, SampleType, null: true, resolver: ::Resolvers::SampleResolver
  end
end
