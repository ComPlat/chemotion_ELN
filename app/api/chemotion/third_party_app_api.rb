# frozen_string_literal: true

TPA_EXPIRATION = 48.hours

module Chemotion
  # Publish-Subscription MessageAPI
  class ThirdPartyAppAPI < Grape::API
    helpers AttachmentHelpers
    helpers ThirdPartyAppHelpers

    # desc: public endpoint for third party apps to {down,up}load files
    namespace :public do
      resource :third_party_apps, requirements: { token: /.*/ } do
        route_param :token, regexp: /^[\w-]+\.[\w-]+\.[\w-]+$/ do
          after_validation do
            parse_payload(JsonWebToken.decode(params[:token]))
          end
          desc 'download file to 3rd party app'
          get '/', requirements: { token: /.*/ } do
            download_attachment_to_third_party_app
          end

          desc 'Upload file from 3rd party app'
          params do
            requires :file, type: File, desc: 'File to upload'
            optional :attachmentName, type: String, desc: 'Name of the file'
          end
          post '/' do
            upload_attachment_from_third_party_app
          end
        end
      end
    end

    resource :third_party_apps do
      rescue_from ActiveRecord::RecordNotFound do
        error!('Record not found', 404)
      end
      namespace :admin do
        before do
          error!('Unauthorized. User has to be admin.', 401) unless current_user.is_a?(Admin)
        end
        after_validation do
          params[:name]&.strip!
          params[:url]&.strip!
          params[:file_types]&.strip!
        end

        desc 'create new third party app entry'
        params do
          requires :url, type: String, allow_blank: false, desc: 'The url in order to redirect to the app.'
          requires :name, type: String, allow_blank: false,
                          desc: 'name of third party app. User will chose correct app based on names.'
          requires :file_types, type: String, desc: 'comma separated mime-types'
        end

        rescue_from ActiveRecord::RecordInvalid do |e|
          error!(e.record.errors.full_messages.join(', '), 400)
        end

        post do
          ThirdPartyApp.create!(declared(params))
          status 201
        end

        route_param :id, type: Integer, desc: '3rd party app id' do
          desc 'update a third party app entry'
          params do
            optional :url, type: String, allow_blank: false, desc: 'The url where the 3rd party app lives.'
            optional :name, type: String, allow_blank: false, desc: 'Name of third party app.'
            optional :file_types, type: String, desc: 'comma separated mime-types'
          end

          put do
            ThirdPartyApp.find(params[:id]).update!(declared(params, include_missing: false))
            status 201
          end

          desc 'delete third party app entry'
          delete do
            ThirdPartyApp.delete(params[:id])
            status 201
          end
        end
      end

      desc 'get all thirdPartyApps'
      get do
        ThirdPartyApp.all
      end

      desc 'create token for use in download public_api'
      params do
        requires :attID, type: Integer, desc: 'Attachment ID'
        requires :appID, type: Integer, desc: 'id of the third party app'
      end

      get 'token' do
        prepare_payload
        parse_payload
        encode_and_cache_token
        return error!('No read access to attachment', 403) unless read_access?(@attachment, @current_user)

        # redirect url with callback url to {down,up}load file: NB path should match the public endpoint
        url = CGI.escape("#{Rails.application.config.root_url}/api/v1/public/third_party_apps/#{@token}")
        "#{@app.url}?url=#{url}"
      end

      route_param :id, type: Integer, desc: '3rd party app id' do
        desc 'get a thirdPartyApps by id'
        get do
          ThirdPartyApp.find(params[:id])
        end
      end
    end
  end
end
