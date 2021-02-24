module Chemotion
  class PrivateNoteAPI < Grape::API
    include Grape::Kaminari
    helpers ParamsHelpers
        
    resource :private_notes do
      desc "Return private note by id"
      params do
        requires :id, type: Integer, desc: "Private note id"
      end

      route_param :id do

        before do
          error!('401 Unauthorized', 401) unless current_user
        end

        get do
          note = PrivateNote.find(params[:id])
          if note.created_by == current_user.id
            {note: note}
          else
            error!('401 Unauthorized', 401)
          end
        end
      end

      desc "Return private note by noteable_id and noteable_type"
      params do
        requires :noteable_id, type: Integer, desc: "Notable id"
        requires :noteable_type, type: String
      end

      before do
        error!('401 Unauthorized', 401) unless current_user
      end

      post do
        note = PrivateNote.find_by(noteable_id: params[:noteable_id], noteable_type: params[:noteable_type])
        {note: note}
      end

      resource :create do
        desc "Create a note"
        params do
          requires :content, type: String
          optional :noteable_id, type: Integer
          optional :noteable_type, type: String
        end

        before do
          error!('401 Unauthorized', 401) unless current_user
        end

        post do
          attributes = {
            content: params[:content],
            noteable_id: params[:noteable_id],
            noteable_type: params[:noteable_type],
            created_by: current_user.id
          }
          note = PrivateNote.new(attributes)
          note.save!

          {note: note}
        end
      end

      desc "Update a note"
      params do
        requires :id, type: Integer, desc: "Private note id"
        requires :content, type: String
        optional :noteable_id, type: Integer
        optional :noteable_type, type: String
      end
      route_param :id do
        before do
          unless current_user.nil?
            @note = PrivateNote.find(params[:id])
            error!('401 Unauthorized', 401) unless @note.created_by == current_user.id
          else
            error!('401 Unauthorized', 401)
          end
        end

        put do
          attributes = declared(params, include_missing: false)
          @note.update!(attributes)

          {note: @note}
        end
      end

      desc "Delete a note"
      params do
        requires :id, type: Integer, desc: "Private note id"
      end
      route_param :id do
        before do
          unless current_user.nil?
            @note = PrivateNote.find(params[:id])
            error!('401 Unauthorized', 401) unless @note.created_by == current_user.id
          else
            error!('401 Unauthorized', 401)
          end
        end

        delete do
          @note.destroy
        end
      end
    end
  end
end