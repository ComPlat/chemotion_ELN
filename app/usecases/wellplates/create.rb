# frozen_string_literal: true

module Usecases
  module Wellplates
    class Create
      attr_reader :params, :user_id

      def initialize(params, user_id)
        @params = params
        @user_id = user_id
      end

      def execute!
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.create(params.except(:collection_id, :wells, :segments))
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @user_id)
          collection = Collection.find(params[:collection_id])
          CollectionsWellplate.create(wellplate: wellplate, collection: collection)
          CollectionsWellplate.create(wellplate: wellplate, collection: Collection.get_all_collection_for_user(user_id))
          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate
        end
      end
    end
  end
end
