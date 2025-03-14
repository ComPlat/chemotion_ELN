# frozen_string_literal: true

module Usecases
  module Sbmm
    class Finder
      def find_in_eln(id:)
        SequenceBasedMacromolecule.find(id)
      end

      # returns an instance of SequenceBasedMacromolecule
      def find_in_uniprot(primary_accession:)
        uniprot_entry = Uniprot::Client.new.get(primary_accession)
        
        Uniprot::Converter.new(uniprot_entry).to_sequence_based_macromolecule
      end

      # returns an instance of 
      def search_in_eln(search_term:, search_field:)
        SequenceBasedMacromolecule.where(search_field => search_term)
      end

      # returns an array of Uniprot::SearchResult instances
      def search_in_uniprot(search_term:, search_field:)
        Uniprot::Client.new.search(
          search_term: search_term, 
          search_field: search_field
        )
      end
    end
  end
end
