module Usecases
  module Wellplates
    class Create
      attr_reader :params, :user_id

      def initialize(params, user_id)
        @params = params
        @user_id = user_id
      end

      def execute!
        attributes = {
          name: params[:name],
          size: params[:size],
          description: params[:description]
        }

        ActiveRecord::Base.transaction do
          wellplate = Wellplate.create(attributes)
          wellplate.reload
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
