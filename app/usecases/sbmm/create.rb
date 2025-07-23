# frozen_string_literal: true

module Usecases
  module Sbmm
    class Create
      def find_or_create_by(params)
        if params[:uniprot_derivation] == 'uniprot'
          find_or_create_uniprot_protein(params)
        elsif params[:uniprot_derivation] == 'uniprot_modified'
          find_or_create_modified_protein(params)
        else
          find_or_create_unknown_protein(params)
        end
      end

      def find_or_create_parent(parent_identifier:, sbmm_type:, sbmm_subtype:)
        # TODO: clear up confusion about parent parameters sbmm_type and sbmm_subtype, currently those are taken from the
        # child sbmm, which might not be correct within the domain model
        if SequenceBasedMacromolecule.valid_accession?(parent_identifier)
          find_or_create_uniprot_protein(
            primary_accession: parent_identifier,
            sbmm_type: sbmm_type,
            sbmm_subtype: sbmm_subtype
          )
        else
          SequenceBasedMacromolecule.find(parent_identifier.to_i)
        end
      end

      # raise ArgumentError if primary_accession is not a valid accession code
      def find_or_create_uniprot_protein(params)
        primary_accession = params[:primary_accession]
        raise ArgumentError.new("'#{primary_accession}' is not a valid Uniprot accession") unless SequenceBasedMacromolecule.valid_accession?(primary_accession)

        sbmm = SequenceBasedMacromolecule.find_by(uniprot_derivation: 'uniprot', primary_accession: primary_accession)
        return sbmm if sbmm.present?


        new_sbmm = Usecases::Sbmm::Finder.new.find_in_uniprot(primary_accession: primary_accession)
        new_sbmm.sbmm_type = params[:sbmm_type]
        new_sbmm.sbmm_subtype = params[:sbmm_subtype]
        new_sbmm.uniprot_derivation = 'uniprot'
        new_sbmm.save

        new_sbmm
      end

      private

      def find_or_create_modified_protein(params)
        parent = find_or_create_parent(
          parent_identifier: params.delete(:parent_identifier),
          sbmm_type: params[:sbmm_type],
          sbmm_subtype: params[:sbmm_subtype]
        )

        # Step 1: check if the exact same protein is already present (using ALL fields) -> user just selected an existing sbmm without modifying it
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params.merge(parent_id: parent.id))
        return sbmm if sbmm.present?

        # Step 2: check if a protein with the same sequence and modifications exists
        # id is present if an existing SBMM was used
        if sbmm_id = params.delete(:id)
          sbmm = SequenceBasedMacromolecule.find(sbmm_id)
        else # otherwise we create a new one
          sbmm = SequenceBasedMacromolecule.new
        end
        sbmm.assign_attributes(params)
        sbmm.parent = parent

        existing_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(sbmm)
        raise Errors::CreateConflictError.new(sbmm: sbmm, conflicting_sbmm: existing_sbmm) if existing_sbmm.present?

        sbmm.save
        sbmm
      end

      # only difference to modified is that unknown doesn't have a parent sbmm
      def find_or_create_unknown_protein(params)
        # Step 1: check if the exact same protein is already present (using ALL fields) -> user just selected an existing sbmm without modifying it
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params)
        return sbmm if sbmm.present?

        # Step 2: check if a protein with the same sequence and modifications exists
        # id is present if an existing SBMM was used
        if sbmm_id = params.delete(:id)
          sbmm = SequenceBasedMacromolecule.find(sbmm_id)
        else # otherwise we create a new one
          sbmm = SequenceBasedMacromolecule.new
        end
        sbmm.assign_attributes(params)

        existing_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(sbmm)
        raise Errors::CreateConflictError.new(sbmm: sbmm, conflicting_sbmm: existing_sbmm) if existing_sbmm.present?

        sbmm.save
        sbmm
      end
    end
  end
end
