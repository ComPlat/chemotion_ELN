# frozen_string_literal: true

module Chemotion
  # Editor API
  # rubocop:disable ClassLength
  class EditorAPI < Grape::API
    # rubocop:disable Metrics/BlockLength
    namespace :editor do
      namespace :initial do
        get do
          docserver = Rails.configuration.editors&.docserver
          { installed: docserver && docserver[:enable] || false, ext: docserver && docserver[:ext] }
        end
      end

      namespace :start do
        desc 'start to editor a document'
        params do
          requires :attachment_id, type: Integer, desc: 'attachment id'
        end
        before do
          @attachment = Attachment.find_by(id: params[:attachment_id])
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, ResearchPlan.find_by(id: @attachment[:attachable_id])).update?
        end
        post do
          attachment = Attachment.find(params[:attachment_id])
          payload = {
            att_id: attachment.id,
            user_id: current_user.id,
            exp: (Time.now + 15.minutes).to_i
          }
          token = JWT.encode payload, Rails.application.secrets.secret_key_base
        end
      end
    end
  end
end
