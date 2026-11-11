# frozen_string_literal: true

module Usecases
  module Public
    class BuildToken
      def self.execute!(params)
        user = User.where(name_abbreviation: params[:username]).or(User.where(email: params[:username])).take

        return if user.blank?
        # valid_for_authentication? (Devise :lockable) counts failed attempts,
        # locks the account after too many of them and rejects locked accounts
        # even when the password is correct.
        return unless user.valid_for_authentication? { user.valid_password?(params[:password]) }

        payload = {
          first_name: user.first_name,
          user_id: user.id,
          last_name: user.last_name,
        }

        JsonWebToken.encode(payload, purpose: :login)
      end
    end
  end
end
