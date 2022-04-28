# frozen_string_literal: true

module Types
  class MutationType < GraphQL::Schema::Object
    field :signIn, mutation: Mutations::SignInMutation
  end
end
