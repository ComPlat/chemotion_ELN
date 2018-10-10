# frozen_string_literal: true
require 'sys/filesystem'

module Chemotion
  # Publish-Subscription MessageAPI
  # rubocop:disable ClassLength
  class AdminAPI < Grape::API
    # rubocop:disable Metrics/BlockLength
    resource :admin do
      before do
        error(401) unless current_user.is_a?(Admin)
      end

      desc 'Check disk space'
      get 'disk' do
        stat = Sys::Filesystem.stat("/home")
        mb_available = stat.block_size * stat.blocks_available / 1024 / 1024
        { percent_used: stat.percent_used.round(2), mb_available: mb_available }
      end

      namespace :listDevices do
        desc 'Find all devices'
        get 'all' do
          present Device.all.order('first_name, last_name'), with: Entities::DeviceEntity, root: 'devices'
        end
      end

      namespace :device do
        desc 'Get device by Id'
        params do
          requires :id, type: Integer, desc: "device id"
        end
        route_param :id do
          get do
            present Device.find(params[:id]), with: Entities::DeviceEntity, root: 'device'
          end
        end
      end

      namespace :updateDeviceMethod do
        desc 'Update device profile method'
        params do
          requires :id, type: Integer
          requires :data, type: Hash do
            requires :method, type: String
            requires :method_params, type: Hash do
              requires :dir, type: String
              optional :host, type: String
              optional :user, type: String
              optional :number_of_files, type: Integer
            end
          end
        end

        post do
          device = Device.find(params[:id])
          data = device.profile.data || {}
          new_profile = {
            data: data.merge(params[:data] || {})
          }
          device.profile.update!(**new_profile) &&
            new_profile || error!('profile update failed', 500)
        end
      end

      namespace :listUsers do
        desc 'Find all users'
        get 'all' do
          present User.all.order('type desc, id'), with: Entities::UserEntity, root: 'users'
        end
      end

      namespace :resetPassword do
        desc 'reset user password'
        params do
          requires :user_id, type: Integer, desc: 'user id'
          requires :random, type: Boolean, desc: 'random password?'
          optional :password, type: String, desc: 'user pwd', values: ->(v) { v.length > 7 }
        end
        post do
          u = User.find(params[:user_id])
          pwd = nil
          rp = if params[:password] || !Rails.env.production? || params[:random]
                 pwd = params[:password].presence || Devise.friendly_token.first(8)
                 u.reset_password(pwd, pwd)
               else
                 pwd
                 u.send_reset_password_instructions if u.respond_to?(:send_reset_password_instructions)
               end
          status(400) unless rp
          { pwd: pwd, rp: rp, email: u.email }
        end
      end

      namespace :confirmUser do
        desc 'confirm user account'
        params do
          requires :user_id, type: Integer, desc: 'user id'
        end
        post do
          user = User.find_by(id: params[:user_id]);
          user.confirmed_at = DateTime.now
          user.save!
        end
      end

      namespace :newUser do
        desc 'confirm user account'
        params do
          requires :email, type: String, desc: 'user first_name'
          requires :password, type: String, desc: 'user first_name'
          requires :first_name, type: String, desc: 'user first_name'
          requires :last_name, type: String, desc: 'user last_name'
          requires :type, type: String, desc: 'user type'
          requires :name_abbreviation, type: String, desc: 'user type'

        end
        post do
          attributes = declared(params, include_missing: false)
          begin
            User.create!(attributes)
          rescue Exception => e
            { error: e.message }
          end
        end
      end

      namespace :enableDisableAccount do
        desc 'enable or diable account'
        params do
          requires :user_id, type: Integer, desc: 'user id'
          requires :enable, type: Boolean, desc: 'enable or disable account'
        end
        post do
          user = User.find_by(id: params[:user_id]);
          user.unlock_access!() if (params[:enable])
          user.lock_access!(send_instructions: false) if (!params[:enable])
        end
      end

    end
  end
end
