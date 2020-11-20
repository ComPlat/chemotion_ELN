# frozen_string_literal: true

module DataCite
  class Client
    DATA_CITE_BASE_URI = ENV['DATA_CITE_BASE_URI']
    include HTTParty
    base_uri DATA_CITE_BASE_URI
    format :json

    class NotFoundError < StandardError; end
    class UnprocessableEntity < StandardError; end

    def initialize
      @username = ENV['DATA_CITE_API_USERNAME']
      @password = ENV['DATA_CITE_API_PASSWORD']
    end

    def get(doi)
      handle_response do
        self.class.get("/dois/#{doi}", options)
      end
    end

    def create(payload)
      handle_response do
        self.class.post('/dois/', options.merge(body: payload.to_json))
      end
    end

    def update(doi, payload)
      handle_response do
        self.class.put("/dois/#{doi}", options.merge(body: payload.to_json))
      end
    end

    private

    def handle_response
      response = yield

      ap response.parsed_response if Rails.env.development?

      raise NotFoundError if response.code == 404
      raise UnprocessableEntity, prepare_error(response) if response.code == 422

      response.parsed_response
    end

    def prepare_error(response)
      response.parsed_response['errors'].map { |e| "#{e['source']} : #{e['title']}" }.join(', ')
    end

    def options
      {
        basic_auth: {
          username: @username,
          password: @password
        },
        headers: {
          'Content-Type': 'application/vnd.api+json'
        }
      }
    end
  end
end
