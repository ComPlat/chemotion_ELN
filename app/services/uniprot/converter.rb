# frozen_string_literal: true

module Uniprot
  class Converter
    attr_reader :entry

    def initialize(uniprot_entry)
      @entry = uniprot_entry
    end

    # rubocop:disable Metrics/AbcSize
    def to_sequence_based_macromolecule
      SequenceBasedMacromolecule.new(
        uniprot_source: entry.raw_response,
        uniprot_derivation: 'uniprot',
        accessions: entry.accessions,
        primary_accession: entry.primary_accession,
        ec_numbers: entry.ec_numbers,
        systematic_name: entry.full_name,
        short_name: entry.short_name,
        molecular_weight: entry.molecular_weight,
        sequence: entry.sequence,
        link_uniprot: entry.link_uniprot,
        organism: entry.organism,
        taxon_id: entry.taxon_id,
        strain: entry.strain,
        tissue: entry.tissue,
        localisation: entry.localisation,
      )
    end
    # rubocop:enable Metrics/AbcSize
  end
end
