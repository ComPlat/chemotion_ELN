# frozen_string_literal: true

class AuthenticateUser
  prepend SimpleCommand

  def initialize(login, password)
    @login = login
    @password = password
  end

  def call
    JsonWebToken.encode(current_user: user.to_json) if user
  end

    private

  attr_accessor :login, :password

  def user
    user = User.where(name_abbreviation: login).or(User.where(email: login)).take
    return user if user&.valid_password?(password)

    errors.add :user_authentication, 'invalid credentials'
    nil
  end
end
