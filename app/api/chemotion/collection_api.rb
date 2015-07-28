module Chemotion
  class CollectionAPI < Grape::API
    resource :collections do
      desc "Return all serialized collection roots"
      get :roots do
        Collection.roots
      end
    end
  end
end
