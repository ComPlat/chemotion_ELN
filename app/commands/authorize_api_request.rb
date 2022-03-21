require 'moneta'

# frozen_string_literal: true

class AuthorizeApiRequest
  prepend SimpleCommand

  def initialize(headers = {}, cache)
    @headers = headers
    @cache = cache
  end

  def call
    current_user
  end

  private

  attr_reader :headers

  def current_user
    @current_user ||= JSON.parse(decoded_auth_token[:current_user]) if decoded_auth_token
    @current_user || errors.add(:token, 'Invalid token') && nil
  end

  def decoded_auth_token
    token = http_auth_header
    errors.add(:token, 'Invalid token') if @cache[token].present?

    @decoded_auth_token ||= JsonWebToken.decode(token)
  end

  def http_auth_header
    if headers['Authorization'].present?
      return headers['Authorization'].split(' ').last
    else
      errors.add(:token, 'Missing token')
    end

    nil
  end
end
