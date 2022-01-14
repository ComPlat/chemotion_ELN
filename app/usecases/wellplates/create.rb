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
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @current_user.id)
          collection = current_user.collections.where(id: params[:collection_id]).take
          CollectionsWellplate.create(wellplate: wellplate, collection: collection) if collection.present?

          is_shared_collection = false
          unless collection.present?
            sync_collection = current_user.all_sync_in_collections_users.where(id: params[:collection_id]).take
            next if sync_collection.nil?

            is_shared_collection = true
            CollectionsWellplate.create(wellplate: wellplate, collection: Collection.find(sync_collection['collection_id']))
            CollectionsWellplate.create(wellplate: wellplate, collection: Collection.get_all_collection_for_user(sync_collection['shared_by_id']))
          end

          CollectionsWellplate.create(wellplate: wellplate, collection: Collection.get_all_collection_for_user(current_user.id)) unless is_shared_collection

          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate
        end
      end
    end
  end
end
