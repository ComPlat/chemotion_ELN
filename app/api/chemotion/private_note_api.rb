# frozen_string_literal: true

module Chemotion
  class PrivateNoteAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('404 Private note with given id not found', 404)
    end

    helpers do
      def authorize_note_access!(note)
        error!('401 Unauthorized', 401) unless note.created_by == current_user.id
      end
    end

    resource :private_notes do
      params do
        requires :id, type: Integer, desc: 'Private note id'
      end

      route_param :id do
        before do
          @note = PrivateNote.find(params[:id])
          authorize_note_access!(@note)
        end

        desc 'Return private note by id'
        get do
          present @note, with: Entities::PrivateNoteEntity, root: 'note'
        end

        desc 'Update a note'
        params do
          requires :content, type: String
          optional :noteable_id, type: Integer
          optional :noteable_type, type: String, values: %w[Sample Reaction Wellplate Screen ResearchPlan]
        end

        put do
          attributes = declared(params, include_missing: false)
          @note.update!(attributes)

          present @note, with: Entities::PrivateNoteEntity, root: 'note'
        end

        desc 'Delete a note'
        delete do
          @note.destroy
        end
      end

      desc 'Return private note by noteable_id and noteable_type'
      params do
        requires :noteable_id, type: Integer, desc: 'Notable id'
        requires :noteable_type, type: String, values: %w[Sample Reaction Wellplate Screen ResearchPlan]
      end

      get do
        note = PrivateNote.find_by(
          noteable_id: params[:noteable_id],
          noteable_type: params[:noteable_type],
          created_by: current_user.id,
        ) || PrivateNote.new
        present note, with: Entities::PrivateNoteEntity, root: 'note'
      end

      desc 'Create a note'
      params do
        requires :content, type: String
        requires :noteable_id, type: Integer
        requires :noteable_type, type: String, values: %w[Sample Reaction Wellplate Screen ResearchPlan]
      end

      post do
        attributes = {
          content: params[:content],
          noteable_id: params[:noteable_id],
          noteable_type: params[:noteable_type],
          created_by: current_user.id,
        }
        note = PrivateNote.new(attributes)
        note.save!

        present note, with: Entities::PrivateNoteEntity, root: 'note'
      end
    end
  end
end
