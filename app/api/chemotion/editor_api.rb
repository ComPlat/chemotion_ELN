# frozen_string_literal: true

# rubocop:disable Rails/DurationArithmetic

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
          unless ElementPolicy.new(current_user, ResearchPlan.find_by(id: @attachment[:attachable_id])).update?
            error!('401 Unauthorized', 401)
          end
          # error!('401 Unauthorized', 401) if @attachment.oo_editing?
        end
        post do
          payload = {
            att_id: @attachment.id,
            user_id: current_user.id,
            exp: (Time.zone.now + 15.minutes).to_i,
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
              url: "#{Application.config.root_url}/api/v1/public/download?token=#{token}",
              permissions: {
                download: true,
                edit: true,
                fillForms: false,
                review: false,
              },
            },
            editorConfig: {
              callbackUrl: "#{Application.config.root_url}/api/v1/public/callback",
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

# rubocop:enable Rails/DurationArithmetic
