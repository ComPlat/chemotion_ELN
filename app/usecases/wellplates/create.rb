# frozen_string_literal: true

module Usecases
  module Wellplates
    class Create
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute! # rubocop:disable Metrics/AbcSize
        ActiveRecord::Base.transaction do
          is_sync_to_me = params[:is_sync_to_me]

          wellplate = Wellplate.create(params.except(:collection_id, :wells, :segments, :is_sync_to_me))
          wellplate.set_short_label(user: @current_user)
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @current_user.id)

          if is_sync_to_me
            Rails.logger.debug('Creating wellplate in sync collection due to user request (param :is_sync_to_me is set).')
            sync_collection = current_user.all_sync_in_collections_users.where(id: params[:collection_id]).take
            error!('400 Bad Request (Cant find sync collection)', 400) if sync_collection.blank?

            collection = Collection.find(sync_collection['collection_id'])
            CollectionsWellplate.create(wellplate: wellplate, collection: collection) if collection.present?

            sync_out_collection_sharer = Collection.get_all_collection_for_user(sync_collection['shared_by_id'])
            CollectionsWellplate.create(wellplate: wellplate, collection: sync_out_collection_sharer)
          else
            is_shared_collection = false
            if user_collection
              CollectionsWellplate.create(wellplate: wellplate, collection: user_collection)
            elsif sync_collection_user
              is_shared_collection = true
              CollectionsWellplate.create(wellplate: wellplate, collection: sync_collection_user.collection)

              CollectionsWellplate.create(wellplate: wellplate, collection: all_collection_of_sharer)
            end

            CollectionsWellplate.create(
              wellplate: wellplate,
              collection: all_collection_of_current_user
            ) unless is_shared_collection
          end

          WellplateUpdater
            .new(wellplate: wellplate, current_user: current_user)
            .update_wells(well_data: params[:wells])

          wellplate
        end
      end

      private

      def user_collection
        @user_collection ||= current_user.collections.find_by(id: params[:collection_id])
      end

      def sync_collection_user
        @sync_collection_user ||= current_user.all_sync_in_collections_users.find_by(id: params[:collection_id])
      end

      def all_collection_of_sharer
        Collection.get_all_collection_for_user(sync_collection_user.shared_by_id)
      end

      def all_collection_of_current_user
        Collection.get_all_collection_for_user(current_user.id)
      end
    end
  end
end
