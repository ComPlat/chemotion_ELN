# frozen_string_literal: true

module Usecases
  module Wellplates
    class Create
      include UserLabelHelpers
      attr_reader :params, :current_user

      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute! # rubocop:disable Metrics/AbcSize
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.create(
            params.except(:collection_id, :wells, :segments, :size, :user_labels)
                  .merge(collections: [collection]),
          )
          wellplate.set_short_label(user: current_user)
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: current_user.id)
          update_element_labels(wellplate, params[:user_labels], current_user.id)

          if collection_is_owned_by_user?
            CollectionsWellplate.create(wellplate: wellplate, collection: all_collection_of_current_user)
          elsif collection_is_shared_to_user?
            CollectionsWellplate.create(wellplate: wellplate, collection: all_collection_of_sharer)
          end

          WellplateUpdater
            .new(wellplate: wellplate, current_user: current_user)
            .update_wells(well_data: params[:wells])

          wellplate
        end
      end

      private

      def collection
        @collection ||= Collection.accessible_for(current_user).find(params[:collection_id])
      end

      def collection_is_owned_by_user?
        @collection.user == current_user
      end

      def collection_is_shared_to_user?
        @collection.user != current_user && CollectionShare.exists?(collection: @collection, shared_with: current_user)
      end

      def all_collection_of_sharer
        Collection.get_all_collection_for_user(collection.user.id)
      end

      def all_collection_of_current_user
        Collection.get_all_collection_for_user(current_user.id)
      end
    end
  end
end
