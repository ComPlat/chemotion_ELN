# frozen_string_literal: true

module Chemotion
  # HTTP client for the converter-app calls that {Labimotion::Converter} does not
  # implement: profile restore, conversions, and the ontology-aware +tables+
  # upload. Everything else on the +/api/v1/converter+ surface is served by
  # {Labimotion::ConverterAPI} and needs no client here.
  #
  # Base URI, basic-auth credentials and timeout are read back from
  # {Labimotion::Converter} so that this client and the gem always address the
  # same converter-app instance configured in +config/converter.yml+.
  class ConverterClient
    # Raised when converter-app answers with a non-success status.
    class RequestError < StandardError
      # @return [Integer] HTTP status returned by converter-app
      attr_reader :code
      # @return [String] raw response body
      attr_reader :body

      def initialize(code, body)
        @code = code
        @body = body
        super("converter-app responded with HTTP #{code}")
      end
    end

    JSON_HEADERS = { 'Content-Type' => 'application/json' }.freeze

    class << self
      # Creates a profile from +data+.
      #
      # converter-app migrates and json-schema-validates the profile on write and
      # answers 400 with an +errors+ body when it does not validate — a
      # {RequestError} carrying that body, so the caller can relay it instead of
      # collapsing it to +nil+ the way {Labimotion::Converter.create_profile} does.
      #
      # @param data [Hash] the profile payload
      # @return [Hash] the created (migrated/validated) profile
      # @raise [RequestError]
      def create_profile(data)
        parse(request(:post, 'profiles', body: data.to_json, headers: JSON_HEADERS))
      end

      # Updates the profile identified by +profile_id+ with +data+.
      #
      # Same write-time migration/validation contract as {.create_profile}: a
      # legacy profile that no longer validates comes back as a {RequestError}
      # (HTTP 400 + +errors+ body) rather than a swallowed +nil+.
      #
      # @param profile_id [String] the profile id
      # @param data [Hash] the profile payload
      # @return [Hash] the updated (migrated/validated) profile
      # @raise [RequestError]
      def update_profile(profile_id, data)
        parse(request(:put, "profiles/#{profile_id}", body: data.to_json, headers: JSON_HEADERS))
      end

      # Restores +profile_id+ to an earlier +version+.
      #
      # @param hard [Boolean] discard the versions newer than +version+
      # @return [Hash] the restored profile
      # @raise [RequestError]
      def restore_profile(profile_id, version, hard: false)
        response = request(
          :post,
          "profiles/restore/#{profile_id}/#{version}",
          body: { hard: hard }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
        parse(response)
      end

      # Uploads a data file and returns its extracted tables.
      #
      # @param tempfile [Tempfile] the uploaded file
      # @param ontology [String, nil] ontology reference to match readers against
      # @return [Hash] the extracted table payload
      # @raise [RequestError]
      def create_tables(tempfile, ontology = nil)
        parse(upload('tables', tempfile, ontology: ontology))
      end

      # Converts an uploaded file. converter-app picks the media type from
      # +format+, so the body is returned unparsed and the caller is responsible
      # for relaying the content type.
      #
      # @param format [String] converter-app output format, e.g. +metajson+
      # @return [HTTParty::Response] raw response
      # @raise [RequestError]
      def create_conversion(tempfile, format, ontology = nil)
        response = upload('conversions', tempfile, format: format, ontology: ontology)
        raise RequestError.new(response.code, response.body) unless success?(response)

        response
      end

      private

      def request(method, path, **options)
        HTTParty.public_send(method, uri(path), { basic_auth: auth, timeout: timeout }.merge(options))
      end

      # HTTParty switches to a multipart body as soon as one value is a File.
      # +compact+ drops unset optional fields so converter-app sees them absent
      # rather than as an empty string.
      def upload(path, tempfile, fields = {})
        File.open(tempfile.path, 'r') do |file|
          request(:post, path, body: { file: file }.merge(fields.compact))
        end
      end

      def parse(response)
        raise RequestError.new(response.code, response.body) unless success?(response)

        response.parsed_response
      end

      def success?(response)
        (200..299).cover?(response.code)
      end

      def uri(path)
        Labimotion::Converter.uri(path)
      end

      def auth
        Labimotion::Converter.auth
      end

      def timeout
        Labimotion::Converter.timeout
      end
    end
  end
end
