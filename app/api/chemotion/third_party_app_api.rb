# frozen_string_literal: true

module Chemotion
  # Publish-Subscription MessageAPI
  class ThirdPartyAppAPI < Grape::API
    helpers do
      def decode_token(token)
        payload = JWT.decode(token, Rails.application.secrets.secret_key_base) unless token.nil?
        error!('401 Unauthorized', 401) if payload&.length&.zero?
        att_id = payload[0]['attID']&.to_i
        user_id = payload[0]['userID']&.to_i
        [att_id, user_id]
      end

      def verify_token(token)
        payload = decode_token(token)
        @attachment = Attachment.find_by(id: payload[0])
        @user = User.find_by(id: payload[1])
        error!('401 Unauthorized', 401) if @attachment.nil? || @user.nil?
      end

      def download_third_party_app(token)
        content_type 'application/octet-stream'
        verify_token(token)
        payload = decode_token(token)
        @attachment = Attachment.find_by(id: payload[0])
        @user = User.find_by(id: payload[1])
        header['Content-Disposition'] = "attachment; filename=#{@attachment.filename}"
        env['api.format'] = :binary
        @attachment.read_file
      end

      def upload_third_party_app(token, file_name, file, file_type)
        payload = decode_token(token)
        attachment = Attachment.find_by(id: payload[0])
        new_attachment = Attachment.new(attachable: attachment.attachable,
                                        created_by: attachment.created_by,
                                        created_for: attachment.created_for,
                                        content_type: file_type)
        File.open(file[:tempfile].path, 'rb') do |f|
          new_attachment.update(file_path: f, filename: file_name)
        end
        { message: 'File uploaded successfully' }
      end
    end

    namespace :public_third_party_app do
      desc 'download file from third party app'
      params do
        requires :token, type: String, desc: 'Token for authentication'
      end
      get '/download' do
        error!('401 Unauthorized', 401) if params[:token].nil?
        download_third_party_app(params[:token])
      end

      desc 'Upload file from third party app'
      params do
        requires :token, type: String, desc: 'Token for authentication'
        requires :attachmentName, type: String, desc: 'Name of the attachment'
        requires :fileType, type: String, desc: 'Type of the file'
      end
      post '/upload' do
        error!('401 Unauthorized', 401) if params[:token].nil?
        error!('401 Unauthorized', 401) if params[:attachmentName].nil?
        error!('401 Unauthorized', 401) if params[:fileType].nil?
        verify_token(params[:token])
        upload_third_party_app(params[:token],
                               params[:attachmentName],
                               params[:file],
                               params[:file_type])
      end
    end

    resource :third_party_apps_administration do
      before do
        error(401) unless current_user.is_a?(Admin)
      end

      desc 'check that name is unique'
      params do
        requires :name
      end
      post '/name_unique' do
        declared(params, include_missing: false)
        result = ThirdPartyApp.all_names.exclude?(params[:name])
        if result
          { message: 'Name is unique' }
        else
          { message: 'Name is not unique' }
        end.to_json
      rescue ActiveRecord::RecordInvalid
        error!('Unauthorized. User has to be admin.', 401)
      end

      desc 'create new third party app entry'
      params do
        requires :IPAddress, type: String, desc: 'The IPAddress in order to redirect to the app.'
        requires :name, type: String, desc: 'name of third party app. User will chose correct app based on names.'
      end
      post '/new_third_party_app' do
        declared(params, include_missing: false)
        ThirdPartyApp.create!(IPAddress: params[:IPAddress], name: params[:name])
        status 201
      rescue ActiveRecord::RecordInvalid
        error!('Unauthorized. User has to be admin.', 401)
      end

      desc 'update a third party app entry'
      params do
        requires :id, type: String, desc: 'The id of the app which should be updated'
        requires :IPAddress, type: String, desc: 'The IPAddress in order to redirect to the app.'
        requires :name, type: String, desc: 'name of third party app. User will chose correct app based on names.'
      end
      post '/update_third_party_app' do
        declared(params, include_missing: false)
        entry = ThirdPartyApp.find(params[:id])
        entry.update!(IPAddress: params[:IPAddress], name: params[:name])
        status 201
      rescue ActiveRecord::RecordInvalid
        error!('Unauthorized. User has to be admin.', 401)
      end

      desc 'delete third party app entry'
      params do
        requires :id, type: String, desc: 'The id of the app which should be deleted'
      end
      post '/delete_third_party_app' do
        id = params[:id].to_i
        ThirdPartyApp.delete(id)
        status 201
      rescue ActiveRecord::RecordInvalid
        error!('Unauthorized. User has to be admin.', 401)
      end
    end

    resource :third_party_apps do
      desc 'Find all thirdPartyApps'
      get 'all' do
        ThirdPartyApp.all
      end

      desc 'get third party app by id'
      params do
        requires :id, type: String, desc: 'The id of the app'
      end
      get 'get_by_id' do
        ThirdPartyApp.find(params[:id])
      end

      desc 'get ip address of third party app'
      params do
        requires :name, type: String, desc: 'The name of the app for which the ip address should be get.'
      end
      get 'IP' do
        tpa = ThirdPartyApp.find_by(name: params[:name])
        return tpa.IPAddress if tpa

        error_msg = "Third party app with ID: #{id} not found"
        { error: error_msg }
      end

      desc 'create token for use in download public_api'
      params do
        requires :attID, type: String, desc: 'Attachment ID'
        requires :userID, type: String, desc: 'User ID'
      end
      get 'Token' do
        payload = { attID: params[:attID], userID: params[:userID] }
        JsonWebToken.encode(payload, 48.hours.from_now)
      end
    end

    resource :names do
      desc 'Find all names of all third party app'
      get 'all' do
        ThirdPartyApp.all_names
      end
    end
  end
end
