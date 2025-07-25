# frozen_string_literal: true

module Usecases
  module Sbmm
    class Sample
      attr_reader :current_user

      def initialize(current_user:)
        @current_user = current_user
      end

      def create(params)
        sample = nil
        SequenceBasedMacromoleculeSample.transaction do
          sbmm = ::Usecases::Sbmm::Finder.new.find_or_initialize_by(params[:sequence_based_macromolecule_attributes].dup)
          raise_if_sbmm_is_not_writable!(sbmm)

          sample = SequenceBasedMacromoleculeSample.new(params.except(:sequence_based_macromolecule_attributes, :collection_id, :container))
          sample.user = current_user
          sample.container = ::Usecases::Containers::UpdateDatamodel.new(current_user).update_datamodel(params[:container]) if params[:container]
          sample.sequence_based_macromolecule = sbmm
          target_collections(params).each do |collection|
            sample.collections << collection
          end

          sample.save!
        end

        sample
      end

      def update(sample, params)
        # TODO: Prüfen ob der User das Update überhaupt durchführen darf
        sample.transaction do
          sbmm = Usecases::Sbmm::Finder.new.find_or_initialize_by(params[:sequence_based_macromolecule_attributes].dup)
          raise_if_sbmm_is_not_writable!(sbmm)

          sample.sequence_based_macromolecule = sbmm
          sample.update!(params.except(:sequence_based_macromolecule_attributes, :container, :collection_id))
          sample.container = ::Usecases::Containers::UpdateDatamodel.new(current_user).update_datamodel(params[:container]) if params[:container]
        end

        sample
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

      def raise_if_sbmm_is_not_writable!(sbmm)
        return unless sbmm.persisted? # new objects are fine, the finder took care of checking if a duplicate exists
        return if current_user.is_a?(Admin)

        # there is at least one other user that uses this SBMM
        if SequenceBasedMacromoleculeSample.user_count_for_sbmm(sbmm_id: sbmm.id, except_user_id: current_user.id).positive?
          raise Errors::SbmmUpdateNotAllowedError.new(
            original_sbmm: SequenceBasedMacromolecule.find(sbmm.id),
            requested_changes: sbmm
          )
        end
      end
    end
  end
end
