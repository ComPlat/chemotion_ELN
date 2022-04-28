# frozen_string_literal: true

module Types
  class BaseObject < GraphQL::Schema::Object
    edge_type_class(Types::BaseEdge)
    connection_type_class(Types::BaseConnection)
    field_class Types::BaseField

    field :id, Int, null: false, description: 'Id of Object'
    field :created_at,
          GraphQL::Types::ISO8601DateTime,
          null: false,
          description: 'CreatedAt of object'
    field :updated_at,
          GraphQL::Types::ISO8601DateTime,
          null: false,
          description: 'UpdatedAt of object'
  end
end
