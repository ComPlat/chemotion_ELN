# frozen_string_literal: true

module Chemotion
  # Publish-Subscription MessageAPI
  class AdminUserAPI < Grape::API
    resource :admin_user do
      namespace :listUsers do
        desc 'Find all users'
        get 'all' do
          present User.all.order('type desc, id'), with: Entities::UserEntity, root: 'users'
        end

        desc 'Find top (5) matched user by name and by type'
        params do
          requires :name, type: String, desc: 'user name'
          optional :type, type: [String], desc: 'user types',
                          coerce_with: ->(val) { val.split(/[\s|,]+/) }, values: %w[Group Device Person Admin]
          optional :limit, type: Integer, default: 5
        end
        get 'byname' do
          return { users: [] } if params[:name].blank?

          users = params[:type] ? User.where(type: params[:type]) : User
          users = users.by_name(params[:name])
                       .limit(params[:limit])
          present users, with: Entities::UserSimpleEntity, root: 'users'
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
                 u.respond_to?(:send_reset_password_instructions) && u.send_reset_password_instructions
               end
          status(400) unless rp
          { pwd: pwd, rp: rp, email: u.email }
        end
      end

      namespace :newUser do
        desc 'crate new user account'
        params do
          requires :email, type: String, desc: 'user email'
          requires :password, type: String, desc: 'user password'
          requires :first_name, type: String, desc: 'user first_name'
          requires :last_name, type: String, desc: 'user last_name'
          requires :type, type: String, desc: 'user type'
          requires :name_abbreviation, type: String, desc: 'user name abbr'
        end
        post do
          attributes = declared(params, include_missing: false)
          User.create!(attributes)
          status 201
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :updateUser do
        desc 'update user account'
        params do
          requires :id, type: Integer, desc: 'user ID'
          requires :email, type: String, desc: 'user email'
          requires :first_name, type: String, desc: 'user first_name'
          requires :last_name, type: String, desc: 'user last_name'
          requires :name_abbreviation, type: String, desc: 'user name name_abbreviation'
          requires :type, type: String, desc: 'user type'
        end
        post do
          attributes = declared(params, include_missing: false)
          user = User.find_by(id: params[:id])
          error!('401 Not found', 404) unless user
          begin
            user.update!(attributes) unless attributes.empty?
            status 201
          rescue ActiveRecord::RecordInvalid => e
            { error: e.message }
          end
        end
      end

      namespace :updateAccount do
        desc 'update account'
        params do
          requires :user_id, type: Integer, desc: 'user id'
          optional :enable, type: Boolean, desc: 'enable or disable account'
          optional :is_templates_moderator, type: Boolean, desc: 'enable or disable ketcherails template moderation'
          optional :confirm_user, type: Boolean, desc: 'confirm account'
          optional :reconfirm_user, type: Boolean, desc: 'reconfirm account'
          optional :molecule_editor, type: Boolean, desc: 'enable or disable molecule moderation'
          optional :converter_admin, type: Boolean, desc: 'converter profile'
          optional :account_active, type: Boolean, desc: 'active or inactive this user'
          optional :auth_generic_admin, type: Hash do
            optional :elements, type: Boolean, desc: 'un-authorize the user as generic elements admin'
            optional :segments, type: Boolean, desc: 'un-authorize the user as generic segments admin'
            optional :datasets, type: Boolean, desc: 'un-authorize the user as generic datasets admin'
          end
        end

        post do
          user = User.find_by(id: params[:user_id])
          unless params[:enable].nil?
            case params[:enable]
            when true
              user.unlock_access!
            when false
              user.lock_access!(send_instructions: false)
            end
          end

          if params[:reconfirm_user].present? && (params[:reconfirm_user] == true)
            user.update_columns(email: user.unconfirmed_email,
                                unconfirmed_email: nil)
          end

          unless params[:confirm_user].nil?
            case params[:confirm_user]
            when true
              user.update!(confirmed_at: DateTime.now)
            when false
              user.update!(confirmed_at: nil)
            end
          end

          unless params[:is_templates_moderator].nil?
            case params[:is_templates_moderator]
            when true, false
              profile = user.profile
              pdata = profile.data || {}
              data = pdata.merge('is_templates_moderator' => params[:is_templates_moderator])
              profile.update!(data: data)
            end
          end

          unless params[:converter_admin].nil?
            case params[:converter_admin]
            when true, false
              profile = user.profile
              pdata = profile.data || {}
              data = pdata.merge('converter_admin' => params[:converter_admin])
              profile.update!(data: data)
            end
          end

          unless params[:molecule_editor].nil?
            case params[:molecule_editor]
            when true, false
              profile = user.profile
              pdata = profile.data || {}
              data = pdata.merge('molecule_editor' => params[:molecule_editor])
              profile.update!(data: data)
            end
          end

          user.update!(account_active: params[:account_active]) unless params[:account_active].nil?
          if params[:auth_generic_admin].present?
            profile = user.profile
            pdata = profile.data || {}
            data = pdata.deep_merge('generic_admin' => params[:auth_generic_admin])
            profile.update!(data: data)
          end

          present user, with: Entities::UserEntity
        end
      end
    end

    resource :matrix do
      namespace :list do
        desc 'Find all matrices'
        get do
          present Matrice.all.order('id'), with: Entities::MatriceEntity, root: 'matrices'
        end
      end

      namespace :update do
        desc 'update matrice'
        params do
          requires :id, type: Integer, desc: 'Matrice ID'
          requires :label, type: String, desc: 'Matrice label'
          requires :enabled, type: Boolean, desc: 'globally enabled'
          optional :include_ids, type: Array, desc: 'include_ids'
          optional :exclude_ids, type: Array, desc: 'exclude_ids'
        end
        post do
          attributes = declared(params, include_missing: false)
          matrice = Matrice.find_by(id: params[:id])
          error!('401 Not found', 404) unless matrice
          begin
            matrice.update!(attributes) unless attributes.empty?
            status 201
          rescue ActiveRecord::RecordInvalid => e
            { error: e.message }
          end
        end
      end

      namespace :update_json do
        desc 'update matrice configs'
        params do
          requires :id, type: Integer, desc: 'Matrice ID'
          requires :configs, type: Hash, desc: 'Matrice configs'
        end
        post do
          matrice = Matrice.find_by(id: params[:id])
          error!('401 Not found', 401) unless matrice
          begin
            matrice.update!(configs: params[:configs])
            load Rails.root.join('config/initializers/devise.rb')
            status 201
          rescue ActiveRecord::RecordInvalid => e
            Rails.logger.error ['update_json', e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
            { error: e.message }
          end
        end
      end
    end
  end
end
