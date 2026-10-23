# frozen_string_literal: true

module InventoryIntegration
  # Replaces every credential value the integration has decrypted, raw or URL-encoded, before text
  # reaches a log, Sentry, a run report or an API error.
  module Redactor
    MASK = '[FILTERED]'
    # Shorter values would mask ordinary words.
    MIN_LENGTH = 6

    @secrets = Concurrent::Set.new

    class << self
      def register(value)
        value = value.to_s
        return if value.length < MIN_LENGTH

        @secrets.merge([value, CGI.escape(value), ERB::Util.url_encode(value)])
      end

      # @return a copy of +object+ (String, Hash or Array, nested) with secrets masked
      def redact(object)
        case object
        when String then redact_string(object)
        when Hash then object.transform_values { |value| redact(value) }
        when Array then object.map { |value| redact(value) }
        else object
        end
      end

      def reset!
        @secrets = Concurrent::Set.new
      end

      private

      def redact_string(text)
        return text if @secrets.empty?

        @secrets.to_a.sort_by { |secret| -secret.length }.reduce(text) { |masked, secret| masked.gsub(secret, MASK) }
      end
    end
  end
end
