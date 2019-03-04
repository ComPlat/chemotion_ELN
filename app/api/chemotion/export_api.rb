module Chemotion
  class ExportAPI < Grape::API
    resource :exports do

      before do
        # TODO: validate collection_id, check permissions
        # handle nested collections
        @collection_ids = params[:collection_id]
      end

      desc "Export collections as json"
      params do
        requires :collection_id, type: Array[Integer]
      end
      post 'json/' do
        ExportCollectionsJob.perform_later('json', @collection_ids)
      end

      desc "Export collections as zip"
      params do
        requires :collection_id, type: Array[Integer]
      end
      post 'zip/' do
        ExportCollectionsJob.perform_later('zip', @collection_ids)
      end
    end
  end
end
