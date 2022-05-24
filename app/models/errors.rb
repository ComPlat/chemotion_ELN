# frozen_string_literal: true

module Errors
  class AuthenticationError < StandardError; end
  class DecodeError < StandardError; end
  class ExpiredSignature < StandardError; end
end
