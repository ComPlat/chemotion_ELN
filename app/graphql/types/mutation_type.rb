# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject
    field :signIn, mutation: Mutations::SignInMutation
  end
end
