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

          # find_or_create_by avoids violating the unique
          # (wellplate_id, collection_id) index when the chosen collection is
          # already the relevant "All" collection (it is attached on create above).
          if collection_is_owned_by_user?
            CollectionsWellplate.find_or_create_by(wellplate: wellplate, collection: all_collection_of_current_user)
          elsif collection_is_shared_to_user?
            CollectionsWellplate.find_or_create_by(wellplate: wellplate, collection: all_collection_of_sharer)
          end

          WellplateUpdater
            .new(wellplate: wellplate, current_user: current_user)
            .update_wells(well_data: params[:wells])

          wellplate
        end
      end

      private

      def collection
        @collection ||= Collection.writable_by(current_user).find_by(id: params[:collection_id]) ||
                        raise(ActiveRecord::RecordNotFound)
      end

      # Group-aware, matching Collection.writable_by (collection.rb) which admitted this collection:
      # a collection owned by one of the user's groups counts as owned, and a share addressed to a
      # group the user belongs to counts as shared. A group-owned collection routes to the owned
      # branch, so the wellplate lands in the creator's "All".
      def collection_is_owned_by_user?
        @collection.owned_by?(current_user)
      end

      def collection_is_shared_to_user?
        !@collection.owned_by?(current_user) &&
          CollectionShare.shared_with(current_user).exists?(collection: @collection)
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
