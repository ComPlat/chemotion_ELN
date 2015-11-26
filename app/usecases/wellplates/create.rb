module Usecases
  module Wellplates
    class Create
      attr_reader :params

      def initialize(params)
        @params = params
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
          WellplateUpdater.update_wells_for_wellplate(wellplate, params[:wells])
          wellplate
        end
      end
    end
  end
end
