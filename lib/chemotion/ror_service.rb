# frozen_string_literal: true

module Chemotion
  class RorService
    include HTTParty

    ROR_API_BASE = 'https://api.ror.org/v2/organizations'
    REQUEST_TIMEOUT = 10

    class << self
      def search(query, country: nil)
        return [] if query.to_s.strip.length < 2

        response = HTTParty.get(build_url(query, country), request_options)
        return [] unless response.success?

        (JSON.parse(response.body)['items'] || []).map { |item| parse_item(item) }
      rescue StandardError => e
        Rails.logger.error "ROR API error: #{e.message}"
        []
      end

      private

      def build_url(query, country)
        filter = country_filter(country)
        "#{ROR_API_BASE}?query=#{URI.encode_www_form_component(query.strip)}&page=1#{filter}"
      end

      def country_filter(country)
        code = ISO3166::Country.find_country_by_any_name(country.to_s)&.alpha2
        code ? "&filter=country.country_code:#{code}" : ''
      end

      def parse_item(item)
        {
          ror_id: item['id'].split('/').last,
          name: extract_display_name(item),
          country: item.dig('locations', 0, 'geonames_details', 'country_name'),
        }
      end

      def extract_display_name(item)
        item['names']&.find { |n| n['types']&.include?('ror_display') }&.dig('value')
      end

      def request_options
        {
          timeout: REQUEST_TIMEOUT,
          headers: { 'Accept' => 'application/json' },
        }
      end
    end
  end
end
