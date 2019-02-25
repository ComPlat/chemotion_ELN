module Chemotion
  class ExportAPI < Grape::API
    resource :exports do
      desc "Get export json for a collection"
      params do
        requires :collection_id, type: Integer, desc: 'collection id'
      end

      post do
        # TODO: validate collection_id
        collections_ids = [params[:collection_id]]

        ExportCollectionJob.perform_later collections_ids
      end
    end
  end
end
