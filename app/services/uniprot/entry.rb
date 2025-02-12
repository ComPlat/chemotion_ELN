# frozen_string_literal: true

module Uniprot
  class Entry
    attr_reader :raw_response

    def initialize(raw_response)
      @raw_response = raw_response
    end

    def uniprot_id
      accession = data.dig('accession')
      accession.is_a?(Array) ? accession.first : accession
    end

    def name
      data.dig('name')
    end

    def full_name
      protein.dig('recommendedName', 'fullName')
    end

    def short_name
      protein.dig('recommendedName', 'shortName')
    end

    def ec_numbers
      ecn = protein.dig('recommendedName', 'ecNumber')
      ecn.is_a?(Array) ? ecn.map { |v| v['__content__'] } : Array(ecn)
    end

    def sequence
      sequence_data.dig('__content__')
    end

    def sequence_of_structure
      sequence_data.dig('__content__')
    end

    def molecular_weight
      sequence_data.dig('mass')
    end

    def link_uniprot
      "https://www.uniprot.org/uniprotkb/#{uniprot_id}/entry"
    end

    def data
      @raw_response.dig('uniprot', 'entry') || {}
    end

    def protein
      data.dig('protein') || {}
    end

    def sequence_data
      data.dig('sequence') || {}
    end
  end
end
