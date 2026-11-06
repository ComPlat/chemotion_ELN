# frozen_string_literal: true

require 'net/http'
require 'timeout'

class LlmClient
  # The HTTP exchange behind LlmClient: one deadline and a size cap per reply,
  # and the connection pinned to a checked address for user-chosen endpoints.
  module Transport
    # The most a reply may hold. A chat answer or a model catalogue is well under it.
    MAX_RESPONSE_BYTES = 8.megabytes
    OPEN_TIMEOUT = 10

    # Failures below HTTP: the request produced no answer, so retrying may help.
    TRANSPORT_ERRORS = [
      Timeout::Error, SocketError, SystemCallError, IOError, OpenSSL::SSL::SSLError, Net::ProtocolError,
      Net::HTTPBadResponse
    ].freeze

    private

    # [status, body], read under one deadline for the whole exchange and capped at
    # MAX_RESPONSE_BYTES: read_timeout alone bounds each read, not the total.
    def perform(request)
      http = http_client
      Timeout.timeout(@timeout, Net::ReadTimeout) do
        http.start do |connection|
          connection.request(request) { |response| return [response.code.to_i, read_capped(response)] }
        end
      end
    end

    def read_capped(response)
      body = +''
      response.read_body do |chunk|
        body << chunk
        raise Errors::LlmProviderError, "The provider's reply is larger than #{MAX_RESPONSE_BYTES} bytes." \
          if body.bytesize > MAX_RESPONSE_BYTES
      end
      body
    end

    def transport_failure_message(error)
      return "LLM request timed out: #{error.message}" if error.is_a?(Timeout::Error)

      "LLM request failed before the provider answered (#{error.class}): #{error.message}"
    end

    def http_client
      http               = Net::HTTP.new(@uri.hostname, @uri.port)
      http.use_ssl       = (@uri.scheme == 'https')
      http.read_timeout  = @timeout
      http.open_timeout  = OPEN_TIMEOUT
      http.write_timeout = @timeout
      http.max_retries   = 0
      restrict!(http) if @restrict_endpoint
      http
    end

    # ipaddr= sets only where the socket connects; Host and SNI still come from the
    # URI. A proxy would resolve a plain-http name again, so that case is refused.
    def restrict!(http)
      if http.proxy? && !http.use_ssl?
        raise Errors::LlmNotConfiguredError,
              'This server reaches the internet through a proxy, so a personal endpoint must use https://.'
      end

      http.ipaddr = pinned_address
    end

    def pinned_address
      LlmEndpointPolicy.pinned_address!(@uri.hostname)
    end
  end
end
