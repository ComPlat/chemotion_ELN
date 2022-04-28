# frozen_string_literal: true

# :nocov:
module Types
  class BaseInputObject < GraphQL::Schema::InputObject
    argument_class Types::BaseArgument
  end
end
# :nocov:
