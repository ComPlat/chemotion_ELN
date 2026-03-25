# frozen_string_literal: true

class OtpWebToken

  def self.disable_link(current_user)
    jwt = encode(current_user)
    url = Rails.application.config.root_url
    "#{url}/users/two_factor_auth/request_disable?jwt=#{jwt}"
  end

  def self.enable_link(current_user)
    jwt = encode(current_user)
    url = Rails.application.config.root_url
    "#{url}/users/two_factor_auth/request_enable?jwt=#{jwt}"
  end

  def self.encode(current_user)
    payload = {
      user_id: current_user.id,
      action: 'activate_2fa',
    }

    JsonWebToken.encode(payload, 30.minutes.from_now)
  end
end
