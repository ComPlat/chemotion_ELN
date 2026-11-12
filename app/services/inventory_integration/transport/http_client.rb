# frozen_string_literal: true

require 'net/http'

module InventoryIntegration
  module Transport
    # HTTP for adapters, limited to the connection's base URL: host policy and pinned address,
    # timeouts, a response size cap, no redirects, and errors without secrets.
    class HttpClient
      USER_AGENT = 'Chemotion ELN inventory integration'
      ABSOLUTE = %r{\A([a-z][a-z0-9+.-]*:|//)}i.freeze
      # Dot segments would climb out of the base path; query and fragment belong in query:.
      UNSAFE_PATH = %r{(\A|/)\.{1,2}(/|\z)|[?#\s]}.freeze
      STATUS_ERRORS = {
        401 => Errors::AuthenticationError, 403 => Errors::PermissionError, 404 => Errors::NotFound,
        408 => Errors::TransientError
      }.freeze

      Response = Struct.new(:status, :headers, :body, keyword_init: true) do
        def json
          JSON.parse(body)
        rescue JSON::ParserError
          raise Errors::UpstreamContractError, 'the response is not JSON'
        end
      end

      # @param network [Hash] IntegrationConfig#network
      def initialize(base_url:, policy:, network:, auth: Auth::None.new)
        @policy = policy
        @base = policy.normalize!(base_url)
        @network = network
        @auth = auth
      end

      # One path segment from a value of the source, e.g. an external id.
      def self.segment(value)
        ERB::Util.url_encode(value.to_s)
      end

      # @param path [String] relative to the base URL; build segments from source values with .segment
      def get(path, query: {}, headers: {})
        request(Net::HTTP::Get, path, query, headers)
      end

      def post(path, body:, query: {}, headers: {})
        request(Net::HTTP::Post, path, query, headers.merge('Content-Type' => 'application/json'), body.to_json)
      end

      private

      def request(klass, path, query, headers, body = nil)
        uri = @auth.uri(build_uri(path, query))
        address = @policy.resolve!(uri.host)
        request = @auth.sign(klass.new(uri.request_uri, { 'Accept' => 'application/json',
                                                          'User-Agent' => USER_AGENT }.merge(headers)))
        request.body = body if body
        check_status!(perform(uri, address, request))
      rescue Timeout::Error, SystemCallError, SocketError, IOError, OpenSSL::SSL::SSLError => e
        raise Errors::TransientError, Redactor.redact("#{@base.host}: #{e.class.name}: #{e.message}")
      end

      def build_uri(path, query)
        raise ArgumentError, 'request paths are relative to the base URL' if path.to_s.match?(ABSOLUTE)
        raise ArgumentError, 'request paths must stay below the base URL' if path.to_s.match?(UNSAFE_PATH)

        @base.dup.tap do |uri|
          uri.path = [@base.path, path.to_s.delete_prefix('/')].reject(&:empty?).join('/').prepend('/').squeeze('/')
          uri.query = URI.encode_www_form(query) if query.any?
        end
      end

      def perform(uri, address, request)
        http = Net::HTTP.new(uri.host, uri.port)
        http.ipaddr = address.to_s
        http.use_ssl = uri.scheme == 'https'
        http.verify_mode = OpenSSL::SSL::VERIFY_PEER
        http.open_timeout = @network['open_timeout']
        http.read_timeout = @network['read_timeout']
        http.start { http.request(request) { |response| return read(response) } }
      end

      def read(response)
        limit = @network['max_response_mb'] * 1024 * 1024
        body = +''
        response.read_body do |chunk|
          body << chunk
          if body.bytesize > limit
            raise Errors::UpstreamContractError,
                  "the response exceeds #{@network['max_response_mb']} MB"
          end
        end
        Response.new(status: response.code.to_i, headers: response.to_hash, body: body)
      end

      def check_status!(response)
        status = response.status
        return response if (200..299).cover?(status)

        message = "#{@base.host} answered HTTP #{status}"
        raise status_error(status, response), message
      end

      def status_error(status, response)
        return Errors::RateLimited.new(retry_after: response.headers['retry-after']&.first&.to_i) if status == 429
        return Errors::TransientError if status >= 500

        STATUS_ERRORS.fetch(status, Errors::UpstreamContractError)
      end
    end
  end
end
