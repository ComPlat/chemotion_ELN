# frozen_string_literal: true

module GraphqlAuthentication
  # See https://graphql-ruby.org/api-doc/2.0.14/GraphQL/Schema/Resolver.html#ready%3F-instance_method
  def ready?(**_args)
    raise Errors::AuthenticationError, 'User is unauthenticated' if current_user.blank?

    true
  end

  def current_user
    context[:current_user]
  end
end
