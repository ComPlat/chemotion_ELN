# frozen_string_literal: true

module Types
  class QueryType < GraphQL::Schema::Object
    field :collection, CollectionType, null: true, resolver: ::Resolvers::CollectionResolver
    field :sample, SampleType, null: true, resolver: ::Resolvers::SampleResolver
  end
end
