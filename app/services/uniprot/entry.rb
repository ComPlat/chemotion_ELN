# frozen_string_literal: true

module Uniprot
  class Entry
    attr_reader :raw_response

    delegate :dig, to: :@raw_response

    def initialize(raw_response)
      @raw_response = raw_response
    end

    def primary_accession
      dig('primaryAccession')
    end

    def accessions
      [primary_accession, dig('secondaryAccessions')].flatten
    end

    def identifier
      dig('uniProtkbId')
    end

    def full_name
      dig('proteinDescription', 'recommendedName', 'fullName', 'value') ||
        dig('proteinDescription', 'submissionNames', 0, 'fullName', 'value')
    end

    def short_name
      dig('proteinDescription', 'recommendedName', 'shortNames', 0, 'value') || full_name # fallback required as short_name is a mandatory db field
    end

    def ec_numbers
      dig('proteinDescription', 'recommendedName', 'ecNumbers')&.map { |entry| entry['value'] } ||
        dig('proteinDescription', 'submissionNames', 0, 'ecNumbers')&.map { |entry| entry['value'] } ||
        []
    end

    def sequence
      dig('sequence', 'value')
    end

    def molecular_weight
      dig('sequence', 'molWeight')
    end

    def link_uniprot
      "https://www.uniprot.org/uniprotkb/#{primary_accession}/entry"
    end

    def organism
      dig('organism', 'scientificName')
    end

    def taxon_id
      dig('organism', 'taxonId')
    end

    # TBD, every reference in the XML can have its own strain entry -> clarify which one we should use
    def strain
      ''
    end

    # TBD, every reference in the XML can have its own tissue entry -> clarify which one we should use
    def tissue
      ''
    end

    # TBD
    def localisation
      ''
    end
  end
end
