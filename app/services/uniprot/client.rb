# frozen_string_literal: true

module Uniprot
  class Client
    UNIPROT_BASE_URL = 'https://rest.uniprot.org'

    include HTTParty
    base_uri UNIPROT_BASE_URL
    format :json

    class NotFoundError < StandardError; end

    def get(primary_accession, raw: false)
      uniprot_result = handle_response do
        self.class.get("/uniprotkb/#{primary_accession}")
      end

      return uniprot_result if raw

      Uniprot::Entry.new(uniprot_result)
    end

    def search(search_term:, search_field: :accession, raw: false)
      search_params = {
        query: "#{search_field}:#{search_term}",
        fields: "id,accession,ec,protein_name,organism_name",
        sort: "accession desc",
        size: 10
      }
      uniprot_result = handle_response do
        self.class.get("/uniprotkb/search", query: search_params)
      end

      return uniprot_result if raw

      uniprot_result["results"].map { |result| Uniprot::SearchResult.new(result) }
    end

    private

    def handle_response
      response = yield

      raise NotFoundError if response.code != 200

      response.parsed_response
    end
  end
end
