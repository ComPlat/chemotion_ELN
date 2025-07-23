# frozen_string_literal: true

module Usecases
  module Sbmm
    class Sample
      attr_reader :current_user

      def initialize(current_user:)
        @current_user = current_user
      end

      def create(params)
        sbmm = ::Usecases::Sbmm::Create.new.find_or_create_by(params[:sequence_based_macromolecule_attributes])
        sample = SequenceBasedMacromoleculeSample.new(params.except(:sequence_based_macromolecule_attributes, :collection_id, :container))
        sample.user = current_user
        sample.container = ::Usecases::Containers::UpdateDatamodel.new(current_user).update_datamodel(params[:container]) if params[:container]
        sample.sequence_based_macromolecule = sbmm
        target_collections(params).each do |collection|
          sample.collections << collection
        end
        sample.save!

        sample
      end

      def update(sbmm_sample, params)
        params = params.dup
        sample_params = params.except(:sequence_based_macromolecule_attributes, :collection_id, :container)
        sbmm_params = params[:sequence_based_macromolecule_attributes]

        if sbmm_sample.sequence_based_macromolecule.uniprot_derivation == 'uniprot_modified'
          parent_identifier = sbmm_params.delete(:parent_identifier)
          # TODO: does the parent have the same type/subtype as the child? Clarify domain model with Nicole
          parent = ::Usecases::Sbmm::Create.new.find_or_create_parent(
            parent_identifier: parent_identifier,
            sbmm_type: sbmm_params[:sbmm_type],
            sbmm_subtype: sbmm_params[:sbmm_subtype]
          )
          sbmm_sample.sequence_based_macromolecule.parent = parent
        end
        # check for duplicate
        sbmm_sample.sequence_based_macromolecule.assign_attributes(sbmm_params)
        duplicate = SequenceBasedMacromolecule.duplicate_sbmm(sbmm_sample.sequence_based_macromolecule)
        raise Errors::UpdateConflictError.new(sbmm: sbmm_sample.sequence_based_macromolecule, conflicting_sbmm: duplicate) if duplicate

        sbmm_sample.transaction do
          sbmm_sample.sequence_based_macromolecule.save!
          sbmm_sample.update!(sample_params)
          sbmm_sample.container = ::Usecases::Containers::UpdateDatamodel.new(current_user).update_datamodel(params[:container]) if params[:container]
        end

        sbmm_sample
      end

      private

      def target_collections(params)
        collections = []
        return collections unless params[:collection_id]

        if sync_collection = current_user.all_sync_in_collections_users.where(id: params[:collection_id]).take
          collections << Collection.find(sync_collection['collection_id'])
          collections << Collection.get_all_collection_for_user(sync_collection['shared_by_id'])
        elsif own_collection = current_user.collections.where(id: params[:collection_id]).take
          collections << own_collection
          collections << Collection.get_all_collection_for_user(current_user.id)
        end

        collections
      end
    end
  end
end
