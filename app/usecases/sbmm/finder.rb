# frozen_string_literal: true

module Usecases
  module Sbmm
    class Finder
      # WARNING:
      #   This method is intended to be used in the SBMM Sample API, which already has parameter validation
      #   Therefore, any missing or malformed parameters will likely make this method crash or create corrupt data.
      #   Don't use it in other places without proper parameter validation!
      def find_or_initialize_by(params)
        params[:sequence] = SequenceBasedMacromolecule.normalize_sequence(params[:sequence]) if params[:sequence]
        psm_params = params.delete(:protein_sequence_modification_attributes)
        ptm_params = params.delete(:post_translational_modification_attributes)

        if params[:uniprot_derivation] == 'uniprot_modified'
          parent_identifier = params.delete(:parent_identifier)
          parent = if SequenceBasedMacromolecule.valid_accession?(parent_identifier)
            parent_sbmm = SequenceBasedMacromolecule.uniprot.find_by(primary_accession: parent_identifier)
            parent_sbmm ||= Uniprot::Converter.new(Uniprot::Client.new.get(parent_identifier)).to_sequence_based_macromolecule
            parent_sbmm.sbmm_type ||= params[:sbmm_type] # must be the same as the child's type, as type can not change when modifying proteins
            parent_sbmm
          else
            SequenceBasedMacromolecule.find(parent_identifier.to_i)
          end
        end

        if params[:uniprot_derivation] == 'uniprot'
          # if already in ELN
          sbmm = SequenceBasedMacromolecule.uniprot.find_by(primary_accession: params[:primary_accession])
          # otherwise fetch from uniprot
          sbmm ||= Uniprot::Converter.new(Uniprot::Client.new.get(params[:primary_accession])).to_sequence_based_macromolecule
        else
          ptm_attrs = PostTranslationalModification.attributes_for_sbmm_uniqueness
          psm_attrs = ProteinSequenceModification.attributes_for_sbmm_uniqueness
          sbmm = SequenceBasedMacromolecule.non_uniprot.with_modifications.find_by(
            sequence: params[:sequence],
            post_translational_modification: ptm_params.slice(*ptm_attrs),
            protein_sequence_modification: psm_params.slice(*psm_attrs)
          )

          sbmm ||= SequenceBasedMacromolecule.new(
            sequence: params[:sequence],
            post_translational_modification_attributes: ptm_params,
            protein_sequence_modification_attributes: psm_params
          )
        end

        sbmm.parent = parent if params[:uniprot_derivation] == 'uniprot_modified'
        sbmm.assign_attributes(params)
        if params[:uniprot_derivation] != 'uniprot'
          sbmm.post_translational_modification.assign_attributes(ptm_params)
          sbmm.protein_sequence_modification.assign_attributes(psm_params)
        end

        sbmm
      end

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
