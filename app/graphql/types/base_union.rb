# frozen_string_literal: true

# :nocov:
module Types
  class BaseUnion < GraphQL::Schema::Union
    edge_type_class(Types::BaseEdge)
    connection_type_class(Types::BaseConnection)
  end
end
# :nocov:
