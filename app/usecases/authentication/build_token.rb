# frozen_string_literal: true

module Usecases
  module Authentication
    class BuildToken
      def self.execute!(params)
        user = User.where(name_abbreviation: params[:username]).or(User.where(email: params[:username])).take

        return if user.blank?
        return unless user.valid_password?(params[:password])

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
