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

      def update(sbmm_sample, params)
        # TODO: Prüfen ob der User das Update überhaupt durchführen darf
        sbmm_sample.transaction do
          sbmm = Usecases::Sbmm::Finder.new.find_or_initialize_by(params[:sequence_based_macromolecule_attributes].dup)
          sbmm_sample.update!(params.except(:sequence_based_macromolecule_attributes, :container, :collection_id))
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
