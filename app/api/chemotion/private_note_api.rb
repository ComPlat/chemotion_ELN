module Chemotion
  class PrivateNoteAPI < Grape::API
    resource :private_notes do
      desc 'Return private note by id'
      params do
        requires :id, type: Integer, desc: 'Private note id'
      end

      route_param :id do
        get do
          note = PrivateNote.find(params[:id])
          if note.created_by == current_user.id
            present note, with: Entities::PrivateNoteEntity, root: 'note'
          else
            error!('401 Unauthorized', 401)
          end
        end
      end

      desc 'Return private note by noteable_id and noteable_type'
      params do
        requires :noteable_id, type: Integer, desc: 'Notable id'
        requires :noteable_type, type: String, values: %w[Sample Reaction]
      end

      get do
        note = PrivateNote.find_by(
          noteable_id: params[:noteable_id], noteable_type: params[:noteable_type], created_by: current_user.id
        ) || PrivateNote.new
        present note, with: Entities::PrivateNoteEntity, root: 'note'
      end

      resource :create do
        desc 'Create a note'
        params do
          requires :content, type: String
          requires :noteable_id, type: Integer
          requires :noteable_type, type: String, values: %w[Sample Reaction]
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

          present note, with: Entities::PrivateNoteEntity, root: 'note'
        end
      end

      desc 'Update a note'
      params do
        requires :id, type: Integer, desc: 'Private note id'
        requires :content, type: String
        optional :noteable_id, type: Integer
        optional :noteable_type, type: String, values: %w[Sample Reaction]
      end
      route_param :id do
        after_validation do
          @note = PrivateNote.find(params[:id])
          error!('404 Private note with given id not found', 404) if @note.nil?
          error!('401 Unauthorized', 401) unless @note.created_by == current_user.id
        end

        put do
          attributes = declared(params, include_missing: false)
          @note.update!(attributes)

          present @note, with: Entities::PrivateNoteEntity, root: 'note'
        end
      end

      desc 'Delete a note'
      params do
        requires :id, type: Integer, desc: 'Private note id'
      end
      route_param :id do
        after_validation do
          @note = PrivateNote.find(params[:id])
          error!('404 Private note with given id not found', 404) if @note.nil?
          error!('401 Unauthorized', 401) unless @note.created_by == current_user.id
        end

        delete do
          @note.destroy
        end
      end
    end
  end
end
