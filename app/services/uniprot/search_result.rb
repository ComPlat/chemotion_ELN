# frozen_string_literal: true

module Uniprot
  class SearchResult
    attr_reader :raw_response

    delegate :dig, to: :@raw_response

    def initialize(raw_response)
      @raw_response = raw_response
    end

    def available_sources
      %w[uniprot]
    end

    def primary_accession
      dig('primaryAccession')
    end

    def organism
      scientific_name = dig('organism', 'scientificName')
      common_name = dig('organism', 'commonName')

      "#{scientific_name} (#{common_name})"
    end

    def full_name
      dig('proteinDescription', 'recommendedName', 'fullName', 'value') ||
        dig('proteinDescription', 'submissionNames', 0, 'fullName', 'value')
    end

    def short_name
      dig('proteinDescription', 'recommendedName', 'shortNames', 0, 'value')
    end

    def identifier
      dig('uniProtkbId')
    end

    def ec_numbers
      dig('proteinDescription', 'recommendedName', 'ecNumbers')&.map { |ecNumber| ecNumber['value'] } ||
        dig('proteinDescription', 'submissionNames', 0, 'ecNumbers')&.map { |ecNumber| ecNumber['value'] } ||
        []
    end

    def taxon_id
      dig('organism', 'taxonId')
    end
  end
end
