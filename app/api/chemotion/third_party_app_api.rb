# frozen_string_literal: true

module Chemotion
  # Publish-Subscription MessageAPI
  class ThirdPartyAppAPI < Grape::API
    helpers do
      def user_type(id)
        user = User.find_by(id: params[:userID])
        user[:type]
      end
    end

    resource :thirdPartyApps do
      namespace :listThirdPartyApps do
        desc 'Find all thirdPartyApps'
        get 'all' do
          ThirdPartyApp.all
        end
      end

      namespace :newThirdPartyApp do
        desc 'create new third party app entry'
        params do
          requires :userID, type: Integer, desc: 'The ID of the current user.'
          requires :IPAddress, type: String, desc: 'The IPAddress in order to redirect to the app.'
          requires :name, type: String, desc: 'name of third party app. User will chose correct app based on names.'
        end
        post do
          declared(params, include_missing: false)
          if user_type(params[:userID]) == 'Admin'
            ThirdPartyApp.create!(IPAddress: params[:IPAddress], name: params[:name])
            status 201
          else
            status 403
            { error: 'Access denied. User must be an Admin.' }
          end
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :editThirdPartyApp do
        desc 'update a third party app entry'
        params do
          requires :userID, type: Integer, desc: 'The ID of the current user.'
          requires :id, type: String, desc: 'The id of the app which should be updated'
          requires :IPAddress, type: String, desc: 'The IPAddress in order to redirect to the app.'
          requires :name, type: String, desc: 'name of third party app. User will chose correct app based on names.'
        end
        post do
          declared(params, include_missing: false)
          if user_type(params[:userID]) == 'Admin'
            entry = ThirdPartyApp.find(params[:id])
            entry.update!(IPAddress: params[:IPAddress], name: params[:name])
            status 201
          else
            status 403
            { error: 'Access denied. User must be an Admin.' }
          end
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :deleteThirdPartyApp do
        desc 'delete third party app entry'
        params do
          requires :userID, type: Integer, desc: 'The ID of the current user.'
          requires :id, type: String, desc: 'The id of the app which should be deleted'
        end
        post do
          if user_type(params[:userID]) == 'Admin'
            id = params[:id].to_i
            ThirdPartyApp.delete(id)
            status 201
          else
            status 403
            { error: 'Access denied. User must be an Admin.' }
          end
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :GetByIDThirdPartyApp do
        desc 'get third party app by id'
        params do
          requires :id, type: String, desc: 'The id of the app'
        end
        get 'all' do
          ThirdPartyApp.find(params[:id])
        end
      end

      namespace :listThirdPartyAppNames do
        desc 'Find all names of all third party app'
        get 'all' do
          ThirdPartyApp.all_names
        end
      end

      namespace :GetIPThirdPartyApp do
        desc 'get ip address of third party app'
        params do
          requires :name, type: String, desc: 'The name of the app for which the ip address should be get.'
        end
        get 'all' do
          tpa = ThirdPartyApp.find_by(name: params[:name])
          return tpa.IPAddress if tpa

          error_msg = "Third party app with ID: #{id} not found"
          { error: error_msg }
        end
      end

      namespace :GetAttachmentToken do
        desc 'create token for use in download public_api'
        params do
          requires :attID, type: String, desc: 'Attachment ID'
          requires :userID, type: String, desc: 'User ID'
        end
        get 'all' do
          payload = { attID: params[:attID], userID: params[:userID]}
          secret = Rails.application.secrets.secret_key_base
          token = JWT.encode payload, secret, 'HS256'
          token
        end
      end
    end
  end
end
