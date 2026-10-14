# frozen_string_literal: true

module Usecases
  module Authentication
    class BuildToken
      # Issues a 2-week JWT for valid credentials.
      #
      # Tries local DB authentication first; if that fails and LDAP is enabled, falls back to
      # an LDAP bind, auto-provisioning the user on first successful login.
      #
      # @param params [Hash] +:username+ (name_abbreviation, email, or LDAP uid) and +:password+
      # @return [String, nil] the encoded JWT, or nil when authentication fails
      def self.execute!(params)
        user = User.where(name_abbreviation: params[:username]).or(User.where(email: params[:username])).take

        return token_for(user) if user&.valid_password?(params[:password])

        ldap_user = authenticate_via_ldap(params[:username], params[:password])
        return if ldap_user.blank?

        token_for(ldap_user)
      end

      # @param username [String] the LDAP uid value
      # @param password [String] the user's password
      # @return [User, nil] the persisted user on a successful LDAP login, otherwise nil
      def self.authenticate_via_ldap(username, password)
        return unless LdapAuthenticationService.enabled?

        attrs = LdapAuthenticationService.authenticate(username, password)
        return if attrs.blank?

        user = User.find_or_create_from_omniauth!(attrs)
        user if user&.persisted?
      end

      # @param user [User]
      # @return [String] the encoded JWT
      def self.token_for(user)
        payload = {
          first_name: user.first_name,
          user_id: user.id,
          last_name: user.last_name,
        }

        JsonWebToken.encode(payload, 2.weeks.from_now)
      end
    end
  end
end
