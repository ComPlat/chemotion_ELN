# frozen_string_literal: true

module AuthenticableApiUser
  extend ActiveSupport::Concern

  private

  def ready?(*)
    return true if current_user

    raise unauthorized_error
  end

  def unauthorized_error
    GraphQL::ExecutionError.new('Unauthorized error', options: { status: :Unauthorized, code: 401 })
  end
end
