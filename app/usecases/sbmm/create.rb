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

      private

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

      def find_or_create_modified_protein(params)
        parent = find_or_create_parent(params)

        # Step 1: check if the exact same protein is already present (using ALL fields) -> user just selected an existing sbmm without modifying it
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params.except(:parent_identifier).merge(parent_id: parent.id))
        return sbmm if sbmm.present?

        # Step 2: check if a protein with the same sequence and modifications exists
        new_sbmm = SequenceBasedMacromolecule.new(params.except(:parent_identifier, :protein_sequence_modification_attributes, :post_translational_modification_attributes))
        new_sbmm.parent = parent
        new_sbmm.protein_sequence_modification = ProteinSequenceModification.new(params[:protein_sequence_modification_attributes])
        new_sbmm.post_translational_modification = PostTranslationalModification.new(params[:post_translational_modification_attributes])

        existing_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(new_sbmm)
        raise Errors::CreateConflictError.new(sbmm: new_sbmm, conflicting_sbmm: existing_sbmm) if existing_sbmm.present?

        new_sbmm.save
        new_sbmm
      end

      # only difference to modified is that unknown doesn't have a parent sbmm
      def find_or_create_unknown_protein(params)
        # Step 1: check if the exact same protein is already present (using ALL fields) -> user just selected an existing sbmm without modifying it
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params)
        return sbmm if sbmm.present?

        # Step 2: check if a protein with the same sequence and modifications exists
        new_sbmm = SequenceBasedMacromolecule.new(params.except(:protein_sequence_modification_attributes, :post_translational_modification_attributes))
        new_sbmm.protein_sequence_modification = ProteinSequenceModification.new(params[:protein_sequence_modification_attributes])
        new_sbmm.post_translational_modification = PostTranslationalModification.new(params[:post_translational_modification_attributes])

        existing_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(new_sbmm)
        raise Errors::CreateConflictError.new(sbmm: new_sbmm, conflicting_sbmm: existing_sbmm) if existing_sbmm.present?

        new_sbmm.save
        new_sbmm
      end

      # TODO: we can not safely assume type and subtype from child protein, so what do we do?
      def find_or_create_parent(params)
        if SequenceBasedMacromolecule.valid_accession?(params[:parent_identifier]) # parent is a uniprot sbmm
          parent = find_or_create_uniprot_protein({
            primary_accession: params[:parent_identifier],
            sbmm_type: params[:sbmm_type],
            sbmm_subtype: params[:sbmm_subtype]
          })
        else
          id = params[:parent_identifier].to_i # TODO: remove .to_i if we ever change our IDs to UUIDs
          parent = SequenceBasedMacromolecule.find(id)
        end
      end
    end
  end
end
