# frozen_string_literal: true

module Errors
  class AuthenticationError < StandardError; end

  class DecodeError < StandardError; end

  class ExpiredSignature < StandardError; end

  class ApplicationError < StandardError; end

  class ForbiddenError < ApplicationError
    def initialize(message = 'Forbidden')
      super(message)
    end
  end

  class DatacollectorError < ApplicationError; end

  # LLM / AI provider errors
  class LlmNotConfiguredError < ApplicationError; end
  class LlmProviderError < ApplicationError; end
  class LlmTimeoutError < LlmProviderError; end
  class LlmRateLimitError < LlmProviderError; end
  class LlmAuthenticationError < LlmProviderError; end
end
