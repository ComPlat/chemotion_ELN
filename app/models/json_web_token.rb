# frozen_string_literal: true

# Signs and verifies the application's JSON web tokens.
#
# Every token carries a `purpose` claim, and decoding requires the caller to
# name the purpose it expects. Tokens are signed with the same secret no matter
# what they are for, so without this check a token issued for e.g. the
# OnlyOffice callback or a 2FA mail link would also be accepted as a login.
class JsonWebToken
  PURPOSES = %w[login editor two_factor_auth third_party_app].freeze

  def self.encode(payload, exp = 6.months.from_now, purpose:)
    raise ArgumentError, "Unknown token purpose: #{purpose}" unless PURPOSES.include?(purpose.to_s)

    claims = payload.to_h.merge(purpose: purpose.to_s, exp: exp.to_i)
    JWT.encode(claims, Rails.application.secret_key_base, 'HS256')
  end

  def self.decode(token, purpose:)
    decoded_token = JWT.decode(token, Rails.application.secrets.secret_key_base)
    payload = decoded_token[0].with_indifferent_access
    raise Errors::WrongTokenPurpose, "Token is not valid for #{purpose}" unless payload[:purpose] == purpose.to_s

    payload
  rescue JWT::ExpiredSignature, JWT::VerificationError => e
    raise Errors::ExpiredSignature, e.message
  rescue JWT::DecodeError => e
    raise Errors::DecodeError, e.message
  end
end
