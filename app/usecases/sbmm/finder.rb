# frozen_string_literal: true

module Usecases
  module Sbmm
    class Finder
      def find_in_eln(id:)
        SequenceBasedMacromolecule.find(id)
      end

      def find_non_uniprot_protein_by(params)
        my_params = params.dup # prevent manipulating params that are still in use from the outside
        joins = []
        if my_params.key?(:protein_sequence_modification_attributes)
          my_params[:protein_sequence_modification] ||= my_params.delete(:protein_sequence_modification_attributes)
          joins << :protein_sequence_modification
        end
        if my_params.key?(:post_translational_modification_attributes)
          my_params[:post_translational_modification] ||= my_params.delete(:post_translational_modification_attributes)
          joins << :post_translational_modification
        end
        SequenceBasedMacromolecule.non_uniprot.joins(*joins).find_by(my_params)
      end

      # returns an instance of SequenceBasedMacromolecule
      def find_in_uniprot(primary_accession:)
        uniprot_entry = Uniprot::Client.new.get(primary_accession)
        
        Uniprot::Converter.new(uniprot_entry).to_sequence_based_macromolecule
      end

      # returns an instance of 
      def search_in_eln(search_term:, search_field:)
        case search_field
        when 'ec'
          SequenceBasedMacromolecule.with_ec_number(search_term)
        when 'accession'
          SequenceBasedMacromolecule.with_accession(search_term)
        when 'protein_name'
          SequenceBasedMacromolecule.search_in_name(search_term)
        else
          SequenceBasedMacromolecule.none
        end
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
