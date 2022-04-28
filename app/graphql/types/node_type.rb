# frozen_string_literal: true

# :nocov:
module Types
  module NodeType
    include Types::BaseInterface
    # Add the `id` field
    include GraphQL::Types::Relay::NodeBehaviors
  end
end
# :nocov:
