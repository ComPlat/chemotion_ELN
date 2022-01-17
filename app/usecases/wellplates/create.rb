# frozen_string_literal: true

module Usecases
  module Wellplates
    class Create
      attr_reader :params, :user

      def initialize(params, user)
        @params = params
        @user = user
      end

      def execute!
        ActiveRecord::Base.transaction do
          wellplate = Wellplate.create(params.except(:collection_id, :wells, :segments))
          wellplate.set_short_label(user: user)
          wellplate.reload
          wellplate.save_segments(segments: params[:segments], current_user_id: @user_id)
          collection = Collection.find(params[:collection_id])
          CollectionsWellplate.create(wellplate: wellplate, collection: collection)
          CollectionsWellplate.create(wellplate: wellplate, collection: Collection.get_all_collection_for_user(user.id))
          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate
        end
      end
    end
  end
end
