# frozen_string_literal: true

module Usecases
  module Authentication
    # Devise::Strategies::Authenticatable (not plain Warden::Strategies::Base)
    # is what defines `validate` - the helper that runs
    # resource.valid_for_authentication? and hooks into Lockable/Confirmable
    # etc. Inheriting from Warden's own base class compiles fine but blows up
    # at runtime the moment validate() is called (NoMethodError).
    class JwtAuthenticatableStrategy < Devise::Strategies::Authenticatable
      def valid?
        request.headers['Authorization'].present?
      end

      def authenticate!
        token = request.headers['Authorization'].to_s.sub(/^Bearer /, '')
        payload = JsonWebToken.decode(token)
        resource = User.find_by(id: payload[:user_id])

        success!(resource) if validate(resource) { true }
      rescue Errors::ExpiredSignature, Errors::DecodeError, JWT::DecodeError
        fail(:invalid_token) # rubocop:disable Style/SignalException
      end
    end
  end
end
