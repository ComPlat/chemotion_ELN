# frozen_string_literal: true

module Usecases
  module Wellplates
    class Create
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute!
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.create(params.except(:collection_id, :wells, :segments))
          wellplate.set_short_label(user: @current_user)
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @current_user.id)

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
