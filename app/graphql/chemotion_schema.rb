# frozen_string_literal: true

class ChemotionSchema < GraphQL::Schema
  mutation(Types::MutationType)
  query(Types::QueryType)
end
