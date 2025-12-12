# frozen_string_literal: true

require 'httparty'

module Analyses
  # Service class for parsing analysis content using the converter app
  class ContentParser
    class << self
      # Parse analysis content and return structured data
      # @param content [String] The analysis content (Quill delta JSON or plain text)
      # @return [Hash] The parsed analysis data with spectroscopy information
      def parse(content)
        return { error: 'No content provided' } if content.blank?

        converter_url = Rails.configuration.converter.url
        return { error: 'Converter not configured' } unless converter_url

        response = HTTParty.post(
          "#{converter_url}/cdc/parse-content",
          body: { content: content }.to_json,
          headers: { 'Content-Type' => 'application/json' },
          timeout: 30
        )

        if response.success?
          JSON.parse(response.body)
        else
          { error: "Converter returned error: #{response.code}" }
        end
      rescue StandardError => e
        Rails.logger.error("ContentParser error: #{e.message}")
        { error: e.message }
      end
    end
  end
end
