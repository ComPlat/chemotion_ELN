require 'moneta'

# frozen_string_literal: true

class AuthorizeApiRequest
  prepend SimpleCommand

  def initialize(headers = {}, cache)
    @headers = headers
    @cache = cache
  end

  def call
    current_user_id
  end

  private

  attr_reader :headers

  def current_user_id
    @current_user_id ||= decoded_auth_token[:current_user_id] if decoded_auth_token
    @current_user_id || errors.add(:token, 'Invalid token') && nil
  end

  def decoded_auth_token
    token = http_auth_header
    return errors.add(:token, 'Missing token') if token.nil?

    return errors.add(:token, 'Invalid token') if @cache[token].present?

    @decoded_auth_token ||= JsonWebToken.decode(token)
  end

  def http_auth_header
    return headers['Authorization'].split(' ').last if headers['Authorization'].present?

    nil
  end
end
