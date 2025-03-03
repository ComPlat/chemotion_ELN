# frozen_string_literal: true

module Usecases
  module Sbmm
    class Create
      def find_or_create_by(params)
        if params[:uniprot_derivation] == 'uniprot'
          find_or_create_uniprot_protein(params[:identifier])
        elsif params[:uniprot_derivation] == 'uniprot_modified' 
          find_or_create_modified_protein(params)
        else
          find_or_create_unknown_protein(params)
        end
      end

      private

      # raise ArgumentError if identifier is not a valid accession code
      def find_or_create_uniprot_protein(identifier)
        raise ArgumentError.new("'#{identifier}' is not a valid Uniprot accession") unless valid_accession?(identifier)

        sbmm = Usecases::Sbmm::Finder.new.find_in_uniprot(primary_accession: identifier)
        sbmm.save unless sbmm.persisted?
        sbmm
      end

      def find_or_create_modified_protein(params)
        if valid_accession?(params[:parent_identifier]) # parent is a uniprot sbmm
          parent = find_or_create_uniprot_protein(params[:parent_identifier])
        else
          id = params[:parent_identifier].to_i # TODO: remove .to_i if we ever change our IDs to UUIDs
          parent = SequenceBasedMacromolecule.find(id)
        end

        # TODO: Duplicate Check for modified or unknown SBMMs
        sbmm =
      end

      def valid_accession?(accession)
        accession.match?(SequenceBasedMacromolecule::ACCESSION_FORMAT)
      end
    end
  end
end
