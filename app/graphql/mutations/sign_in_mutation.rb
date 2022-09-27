# frozen_string_literal: true

module Mutations
  class SignInMutation < BaseMutation
    argument :username, String, required: true
    argument :password, String, required: true

    field :token, String, null: false, description: 'Token for user'

    def resolve(username:, password:)
      user = User.find_by(name_abbreviation: username) || User.find_by(email: username)

      raise Errors::AuthenticationError, 'Wrong credentials' if wrong_credentials?(user, password)

      payload = {
        user_id: user.id,
        first_name: user.first_name,
        last_name: user.last_name
      }
      token = JsonWebToken.encode(payload)

      { token: token }
    end

    def ready?(**_args)
      true
    end

    private

    def wrong_credentials?(user, password)
      user.blank? || !user.valid_password?(password)
    end
  end
end
