# frozen_string_literal: true

module InventoryIntegration
  # Error taxonomy shared by the engine and the adapters; `code` is the stable run-report code.
  module Errors
    class Error < StandardError
      CODE = 'error'

      def code
        self.class::CODE
      end
    end

    class ConfigurationError < Error
      CODE = 'config.invalid'
    end

    class HostNotAllowed < Error
      CODE = 'policy.host_not_allowed'
    end

    class AuthenticationError < Error
      CODE = 'auth.unauthorized'
    end

    class PermissionError < Error
      CODE = 'auth.forbidden'
    end

    class NotFound < Error
      CODE = 'upstream.not_found'
    end

    class TransientError < Error
      CODE = 'transport.timeout'
    end

    class UpstreamContractError < Error
      CODE = 'upstream.shape'
    end

    class RecordInvalid < Error
      CODE = 'contract.invalid'
    end

    class ConflictError < Error
      CODE = 'link.conflict'
    end

    class UncertainDeliveryError < Error
      CODE = 'push.uncertain'
    end

    class UnsupportedOperation < Error
      CODE = 'push.worklist'
    end

    class CredentialsUnreadable < Error
      CODE = 'config.credentials_unreadable'
    end

    class RateLimited < Error
      CODE = 'upstream.rate_limited'

      attr_reader :retry_after

      def initialize(message = nil, retry_after: nil)
        super(message)
        @retry_after = retry_after
      end
    end
  end
end
