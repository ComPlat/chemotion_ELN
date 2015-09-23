module Chemotion
  class LiteratureAPI < Grape::API
    include Grape::Kaminari

    resource :literatures do

      desc "Create a new literature by reaction ID"
      params do
        requires :reaction_id, type: Integer, desc: "Reaction id"
        requires :title, type: String, desc: "Title of the Literature"
        requires :url, type: String, desc: "URL of the Literature"
      end
      post do
        Literature.create(params)
      end

      desc "Delete a literature from a reaction by ID"
      params do
        requires :id, type: Integer, desc: "Literature id"
      end
      delete do
        Literature.find(params[:id]).destroy
      end

      desc "Get literatures by reaction ID"
      params do
        requires :reaction_id, type: Integer, desc: "Reaction id"
      end
      get do
        Literature.where(reaction_id: params[:reaction_id])
      end

    end
  end
end
