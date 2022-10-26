# frozen_string_literal: true

module Chemotion
  # Editor API
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
        desc 'start editing a document'
        params do
          requires :attachment_id, type: Integer, desc: 'attachment id'
        end
        before do
          @attachment = Attachment.find_by(id: params[:attachment_id])
          if @attachment
            can_dwnld = @attachment.container_id.nil? && @attachment.created_for == current_user.id
            if !can_dwnld && (element = @attachment.container&.root&.containable)
              can_dwnld = element.is_a?(User) && (element == current_user) ||
                          ElementPolicy.new(current_user, element).read? &&
                          ElementPermissionProxy.new(current_user, element, user_ids).read_dataset?
            end
          end
          error!('401 Unauthorized', 401) unless can_dwnld
        end
        post do
          payload = {
            att_id: @attachment.id,
            user_id: current_user.id,
            exp: 15.minutes.from_now.to_i,
          }
          @attachment.oo_editing_start!
          token = JWT.encode payload, Rails.application.secrets.secret_key_base
          only_office_payload = {
            width: '100%',
            height: '950px',
            type: 'desktop',
            document: {
              att_id: @attachment.id,
              fileType: 'docx',
              key: token,
              title: @attachment.filename,
              url: "http://#{request.host_with_port}api/v1/public/download?token=#{token}",
              permissions: {
                download: true,
                edit: true,
                fillForms: false,
                review: false,
              },
            },
            editorConfig: {
              callbackUrl: "http://#{request.host_with_port}/api/v1/public/callback",
              mode: 'edit',
              lang: 'en',
              customization: {
                chat: false,
                compactToolbar: false,
                customer: {
                  address: Rails.configuration.editors.info[:address],
                  info: Rails.configuration.editors.info[:title],
                  logo: Rails.configuration.editors.info[:logo],
                  mail: Rails.configuration.editors.info[:mail],
                  name: Rails.configuration.editors.info[:name],
                  www: Rails.configuration.editors.info[:website],
                },
                feedback: {
                  url: Rails.configuration.editors.info[:feedbackurl],
                  visible: false,
                },
                forcesave: false,
                help: false,
                logo: {
                  image: Rails.configuration.editors.info[:logo],
                  imageEmbedded: Rails.configuration.editors.info[:logo],
                  url: Rails.configuration.editors.info[:website],
                },
                showReviewChanges: false,
                zoom: 100,
              },
            },
          }
          only_office_token = JWT.encode only_office_payload, Rails.application.secrets.only_office_secret_key_base

          { token: token, only_office_token: only_office_token }
        end
      end
    end
  end
end
