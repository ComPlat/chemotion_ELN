# frozen_string_literal: true

module Usecases
  module Public
    class BuildToken
      def self.execute!(params, name = nil, user = nil)
        name ||= "nameless #{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"
        if user.nil?
          user = User.where(name_abbreviation: params[:username]).or(User.where(email: params[:username])).take
          return if user.blank?
          return unless user.valid_password?(params[:password])
        end

        if params[:expires_in_days]
          expires_in_days = params[:expires_in_days]
          expires_at = Time.current + expires_in_days.days
        else
          expires_at = 6.months.from_now
        end

        payload = {
          first_name: user.first_name,
          user_id: user.id,
          created: Time.current.to_s,
          last_name: user.last_name
        }

        token = JsonWebToken.encode(payload, expires_at.to_i)
        user.add_token(name: name, token: token, expiration_date: expires_at)
        return nil unless user.save
        token
      end
    end
  end
end
