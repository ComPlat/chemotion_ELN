module Chemotion
  class ExportAPI < Grape::API
    resource :exports do
      desc "Get export json for a collection"
      params do
        requires :collection_id, type: Integer, desc: 'collection id'
      end
      post do
        ExportCollection.perform_later params
      end
    end
  end
end
