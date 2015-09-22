module Chemotion
  class LiteratureAPI < Grape::API
    include Grape::Kaminari

    resource :literatures do

      #todo: more general search api
      desc "Create a new literature by reaction ID"
      params do
        requires :reaction_id, type: Integer, desc: "Reaction id"
        requires :title, type: String, desc: "Title of the Literature"
        requires :url, type: String, desc: "URL of the Literature"
      end
      post do
        Literature.create(params)
      end

    end
  end
end
