# frozen_string_literal: true

module GraphqlCommon
  def ready?(**_args)
    raise Errors::AuthenticationError, 'Unauthorized' if current_user.blank?

    true
  end

  def current_user
    context[:current_user]
  end
end
