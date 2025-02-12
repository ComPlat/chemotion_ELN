# frozen_string_literal: true

module Uniprot
  class Client
    UNIPROT_BASE_URL = 'https://rest.uniprot.org'

    include HTTParty
    base_uri UNIPROT_BASE_URL
    format :xml

    class NotFoundError < StandardError; end

    def get(uniprot_id)
      handle_response do
        self.class.get("/uniprotkb/#{uniprot_id}.xml")
      end
    end

    private

    def handle_response
      response = yield

      raise NotFoundError if response.code != 200

      response.parsed_response
    end
  end
end
