# frozen_string_literal: true

module Usecases
  module Sbmm
    class Update
      # receives params and returns an sbmm (updated with the params if required) or throws errors
      def updated_sbmm(params:)
        if params[:uniprot_derivation] == 'uniprot'
          update_uniprot(params.dup)
        elsif params[:uniprot_derivation] == 'uniprot_modified'
          update_modified(params.dup)
        else 
          update_unknown(params.dup)
        end
      end

      private

      # uniprot does no actual update, but might fetch a new uniprot protein if necessary
      def update_uniprot(params)
        Create.new.find_or_create_uniprot_protein(
          parent_identifier: params[:primary_accession],
          sbmm_type: 'protein' , #TODO: Klären
          sbmm_subtype: 'unmodified' # TODO: Klären
        )
      end

      def update_modified(params)
        # find parent and remove parent_identifier from params
        parent = Create.new.find_or_create_parent(
          parent_identifier: params.delete(:parent_identifier),
          sbmm_type: 'protein',
          sbmm_subtype: 'unmodified' # TODO: Klären
        )

        # Step 1: check if the exact same protein is already present (using ALL fields) -> user just selected an existing sbmm without modifying it
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params.except(:parent_identifier).merge(parent_id: parent.id))
        return sbmm if sbmm.present?

        # Step 2: check if a protein with the same sequence and modifications exists
        existing_sbmm_to_be_updated = SequenceBasedMacromolecule.find(params[:id])
        existing_sbmm_to_be_updated.assign_attributes(params.except(:parent_identifier))
        existing_sbmm_to_be_updated.parent_id = parent.id

        duplicate_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(existing_sbmm_to_be_updated)
        raise Errors::UpdateConflictError.new(sbmm: existing_sbmm_to_be_updated, conflicting_sbmm: duplicate_sbmm) if duplicate_sbmm.present?

        existing_sbmm_to_be_updated.save

        existing_sbmm_to_be_updated
      end

      def update_unknown(params)
        # Step 1: check if the exact same protein is already present (using ALL fields) -> user just selected an existing sbmm without modifying it
        sbmm = Usecases::Sbmm::Finder.new.find_non_uniprot_protein_by(params)
        return sbmm if sbmm.present?

        # Step 2: check if a protein with the same sequence and modifications exists
        existing_sbmm_to_be_updated = SequenceBasedMacromolecule.find(params[:id])
        existing_sbmm_to_be_updated.assign_attributes(params)

        duplicate_sbmm = SequenceBasedMacromolecule.duplicate_sbmm(duplicate_sbmm)
        raise Errors::UpdateConflictError.new(sbmm: existing_sbmm_to_be_updated, conflicting_sbmm: duplicate_sbmm) if duplicate_sbmm.present?

        existing_sbmm_to_be_updated.save

        existing_sbmm_to_be_updated
      end
    end
  end
end
