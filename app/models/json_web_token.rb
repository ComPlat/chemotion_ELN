# frozen_string_literal: true

class JsonWebToken
  def self.encode(payload, exp = 6.months.from_now)
    payload[:exp] = exp.to_i
    JWT.encode(payload, Rails.application.secret_key_base, 'HS256')
  end

  def self.decode(token)
    decoded_token = JWT.decode(token, Rails.application.secrets.secret_key_base)
    payload = decoded_token[0]
    payload.with_indifferent_access
  rescue JWT::ExpiredSignature, JWT::VerificationError => e
    raise Errors::ExpiredSignature, e.message
  rescue JWT::DecodeError => e
    raise Errors::DecodeError, e.message
  end
end
