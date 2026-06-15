# frozen_string_literal: true

require 'net/http'
require 'json'

# Thin HTTP client for the GoeChem REST API (CHEMIKALIENBESTAND endpoint).
# Raises GoeChem::ApiError on non-2xx responses and GoeChem::ConnectionError
# on network failures so callers can distinguish "GoeChem said no" from
# "GoeChem is unreachable".
module GoeChem
  class Client
    ENDPOINT = "#{GoeChem::BASE_URL}/rest/#{GoeChem::API_KEY}/CHEMIKALIENBESTAND/"

    # Fetch the full chemical inventory visible to a GoeChem user.
    # @param goechem_user_id [String, Integer] GoeChem userid (department scope)
    # @return [Array<Hash>] CHEMIKALIENBESTAND rows
    def chemicals(goechem_user_id)
      raise GoeChem::ConnectionError, 'GOECHEM_API_KEY is not configured' if GoeChem::API_KEY.blank?

      post_json(ENDPOINT, { userid: goechem_user_id.to_s, UserAgent: 'Chemotion' })
    end

    # Fetch the endpoint's field metadata (names/types of inventory columns).
    # @return [Hash]
    def metadata
      uri = URI("#{ENDPOINT}metadata")
      response = Net::HTTP.get_response(uri)
      JSON.parse(response.body)
    rescue StandardError => e
      raise GoeChem::ConnectionError, "Metadata fetch failed: #{e.message}"
    end

    private

    def post_json(url, payload)
      uri = URI(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.read_timeout = 60
      http.open_timeout = 15

      request = Net::HTTP::Post.new(uri)
      request['Content-Type'] = 'application/json'
      request.body = payload.to_json

      response = http.request(request)
      raise GoeChem::ApiError, "HTTP #{response.code}: #{response.body[0..200]}" unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue Net::OpenTimeout, Net::ReadTimeout, SocketError => e
      raise GoeChem::ConnectionError, e.message
    end
  end
end
