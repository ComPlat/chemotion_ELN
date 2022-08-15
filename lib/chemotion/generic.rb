# frozen_string_literal: true

require 'net/http'

# Chemotion module
module Chemotion
  # process Generic request
  module Generic
    # Fetch module
    module Fetch
      # Template module
      module Template
        include HTTParty

        def self.stub_request(page)
          options = { timeout: 10, headers: { 'Content-Type' => 'application/json' } }
          HTTParty.get(page, options)
        end

        def self.stub_request_body(page, options)
          HTTParty.post(page, options)
        end

        def self.exec(target, klass, identifier)
          page = URI.join(target, 'api/v1/public/generic_template')
          options = {
            timeout: 10,
            headers: {'Content-Type' => 'application/json'},
            body: { klass: klass, identifier: identifier }.to_json
          }
          begin
            resp = stub_request_body(page, options)
            resp.success? ? resp.parsed_response : nil
          rescue StandardError => e
            Rails.logger.error ["with klass: #{klass}, identifier: #{identifier}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
            nil
          end
        end

        def self.list(target, klass)
          page = if klass
            URI.join(target, "api/v1/public/generic_templates?klass=#{klass}")
          else
            URI.join(target, 'api/v1/public/generic_templates')
          end
          begin
            resp = stub_request(page)
            resp.success? ? resp.parsed_response : nil
          rescue StandardError => e
            Rails.logger.error ["with klass: #{klass}", e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
            nil
          end
        end
      end
    end
  end
end
