# frozen_string_literal: true

module Chemotion
  # Service for fetching data from external sources
  # Handles CAS API with fallback to PubChem
  class CasLookupService
    include HTTParty

    CAS_API_BASE = 'https://commonchemistry.cas.org/api'
    REQUEST_TIMEOUT = 10 # seconds

    class << self
      # Fetch SMILES by CAS number
      # First tries CAS API, falls back to PubChem on error
      # @param cas_number [String] The CAS Registry Number
      # @return [Hash] { smiles: String, cas: String, source: String }
      # @raise [StandardError] if both APIs fail
      def fetch_by_cas(cas_number)
        fast_input = Matrice.fast_input
        cas_api_key = (fast_input[:feature_enabled] && fast_input[:cas_api_key].presence) || ''

        return fetch_from_pubchem(cas_number) unless cas_api_key

        begin
          result = fetch_from_cas(cas_number, cas_api_key)
          return result if result
        rescue StandardError => e
          Rails.logger.info "CAS API failed for #{cas_number}: #{e.message}, falling back to PubChem"
        end

        fetch_from_pubchem(cas_number)
      rescue StandardError => e
        Rails.logger.error "Fetch error for CAS number #{cas_number}: #{e.message}"
        raise e
      end

      private

      # Fetch from CAS API
      # @param cas_number [String] The CAS Registry Number
      # @return [Hash] Returns hash with data
      # @raise [StandardError] if CAS API fails
      def fetch_from_cas(cas_number, cas_api_key)
        url = "#{CAS_API_BASE}/detail?cas_rn=#{URI.encode_www_form_component(cas_number)}"
        response = HTTParty.get(url, cas_request_options(cas_api_key))

        raise StandardError, "CAS API returned status #{response.code} for #{cas_number}" unless response.success?

        result = JSON.parse(response.body)

        raise StandardError, "CAS API error: #{result['message']}" if result['message']

        smiles = result['smile']
        unless smiles.present? && smiles.is_a?(String) && !smiles.strip.empty?
          raise StandardError, "CAS API returned invalid data for #{cas_number}"
        end

        build_cas_response(result, cas_number)
      end

      # Build HTTP request options for CAS API
      # @param cas_api_key [String] API key
      # @return [Hash] HTTParty options
      def cas_request_options(cas_api_key)
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type' => 'application/json',
            'X-Api-Key' => cas_api_key,
          },
        }
      end

      # Build response hash from CAS API result
      # @param result [Hash] Parsed CAS API response
      # @param cas_number [String] CAS number
      # @return [Hash] Formatted response
      def build_cas_response(result, cas_number)
        {
          smiles: result['smile'],
          cas: cas_number,
          source: 'cas',
        }
      end

      # Fetch from PubChem API
      # @param identifier [String] CAS number or name
      # @return [Hash] Returns hash with data
      # @raise [StandardError] if PubChem fails or returns no data
      def fetch_from_pubchem(identifier)
        result = Chemotion::PubchemService.smiles_from_identifier(identifier)

        if result.blank? || result[:smiles].blank?
          raise StandardError,
                "PubChem returned no data for #{identifier}"
        end

        {
          smiles: result[:smiles],
          cas: identifier,
          source: 'pubchem',
        }
      end
    end
  end
end
