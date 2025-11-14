# frozen_string_literal: true

# rubocop:disable Rails/DurationArithmetic

module Chemotion
  # Editor API
  class EditorAPI < Grape::API
    helpers AttachmentHelpers

    namespace :editor do
      desc 'get editor config'
      get :initial do
        docserver = Rails.configuration.editors&.docserver
        { installed: (docserver && docserver[:enable]) || false, ext: docserver && docserver[:ext] }
      end

      route_param :id do
        desc 'start/stop editing a document'
        params do
          requires :id, type: Integer, desc: 'attachment id'
        end

        after_validation do
          @attachment = Attachment.find_by(id: params[:id])
          error!('401 Unauthorized', 401) unless @attachment && read_access?(@attachment, current_user)
        end

        get 'start' do
          error!('401 Unauthorized', 401) unless @attachment.editable_document?
          error!('401 Document is already being edited', 401) if @attachment.editing?
          payload = {
            att_id: @attachment.id,
            user_id: current_user.id,
            exp: (Time.zone.now + 15.minutes).to_i,
          }
          @attachment.editing_start!
          file_extension = @attachment.editable_document? && @attachment.file_extension
          token = JsonWebToken.encode(payload)
          only_office_payload = {
            width: '100%',
            height: '100%',
            type: 'desktop',
            document: {
              att_id: @attachment.id,
              fileType: file_extension,
              key: token,
              title: @attachment.filename,
              url: "#{Rails.configuration.editors.docserver[:callback_server]}/api/v1/public/download?token=#{token}",
              permissions: {
                download: true,
                edit: true,
                fillForms: false,
                review: false,
              },
            },
            editorConfig: {
              callbackUrl: "#{Rails.configuration.editors.docserver[:callback_server]}/api/v1/public/callback",
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

        get :end do
          @attachment.editing_end!
          { message: 'ok' }
        end
      end
    end
  end
end

# rubocop:enable Rails/DurationArithmetic
