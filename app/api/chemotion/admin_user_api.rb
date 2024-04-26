# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength
module Chemotion
  # desc: AdminUserApi class to manage the users and their roles
  class AdminUserAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      # users resource for admin - CRUD + specific actions
      namespace :users do
        desc 'Find all users'
        get do
          present User.order(type: :desc, id: :asc), with: Entities::UserEntity, root: 'users'
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

        desc 'restore deleted user account'
        params do
          optional :name_abbreviation, type: String, desc: 'user name name_abbreviation'
          optional :id, type: Integer, desc: 'user ID'
          at_least_one_of :id, :name_abbreviation
        end
        post :restoreAccount do
          existing_user = User.find_by(name_abbreviation: params[:name_abbreviation])
          deleted_users = User.only_deleted
          if params[:name_abbreviation].present?
            deleted_users = deleted_users.where('email LIKE ?',
                                                "%#{params[:name_abbreviation]}@deleted")
          end
          deleted_users = deleted_users.where(id: params[:id]) if params[:id].present?
          deleted_user = deleted_users.first

          error!({ status: 'error', message: 'Deleted user not found' }) unless deleted_user

          if deleted_users.length > 1
            users_json = []
            deleted_users.each do |item|
              users = { id: item.id, deleted_at: item.deleted_at }
              users_json << users
            end
            error!({ status: 'error',
                     message: 'Error: More than one deleted account exists! Enter the ID of the account to be restored',
                     users: users_json })

          # rubocop:disable Rails/SkipsModelValidations
          elsif existing_user.nil?
            deleted_user.update_columns(deleted_at: nil, name_abbreviation: params[:name_abbreviation])
            # create a default user profile
            deleted_user.has_profile
            { status: 'success',
              message: 'Account successfully restored' }
          elsif existing_user.present?
            deleted_user.update_columns(deleted_at: nil, account_active: false)
            # create a default user profile
            deleted_user.has_profile
            { status: 'warning',
              message: 'Account restored. Warning: Abbreviation already exists! Please update the Abbr and Email' }
          end
          # rubocop:enable Rails/SkipsModelValidations
        end

        desc 'create new user account'
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

        route_param :user_id, type: Integer, desc: 'user ID' do
          # rubocop:disable Rails/HelperInstanceVariable
          after_validation do
            @user = User.find(params.delete(:user_id))
          end

          rescue_from ActiveRecord::RecordNotFound do
            error!('404 user with given id not found', 404)
          end

          desc 'Find user by ID'
          get do
            present @user, with: Entities::UserEntity
          end

          desc 'update user account'
          params do
            optional :email, type: String, desc: 'user email'
            optional :first_name, type: String, desc: 'user first_name'
            optional :last_name, type: String, desc: 'user last_name'
            optional :name_abbreviation, type: String, desc: 'user name name_abbreviation'
            optional :type, type: String, desc: 'user type'
            optional :account_active, type: Boolean, desc: '(in)activate or activate user account'
            # special params
            optional :enable, type: Boolean, desc: '(un)lock user account'
            optional :confirm_user, type: Boolean, desc: 'confirm account'
            optional :reconfirm_user, type: Boolean, desc: 'reconfirm account (email changed)'
          end
          put do
            # (un)lock user - does nothing when params[:enable] is nil
            case params.delete(:enable)
            when true
              @user.unlock_access!
            when false
              @user.lock_access!(send_instructions: false)
            end

            # confirm user new email - does nothing when params[:reconfirm_user] is nil
            if params.delete(:reconfirm_user) == true
              # rubocop:disable Rails/SkipsModelValidations
              @user.update_columns(email: @user.unconfirmed_email, unconfirmed_email: nil)
              # rubocop:enable Rails/SkipsModelValidations
            end

            # confirm user - does nothing when params[:confirm_user] is nil
            case params.delete(:confirm_user)
            when true
              @user.update!(confirmed_at: DateTime.now)
            when false
              @user.update!(confirmed_at: nil)
            end

            attributes = declared(params, include_missing: false)
            @user.update!(attributes) unless attributes.empty?
            present @user, with: Entities::UserEntity
          rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique => e
            { error: e.message }
          end

          desc 'delete user account'
          delete do
            @user.destroy!
            status 204
          end

          desc 'reset user password'
          params do
            requires :random, type: Boolean, desc: 'random password?'
            optional :password, type: String, desc: 'user pwd', values: ->(v) { v.length > 7 }
          end
          put :resetPassword do
            pwd = nil
            rp = if params[:password] || params[:random]
                   pwd = params[:password].presence || Devise.friendly_token.first(10)
                   @user.reset_password(pwd, pwd)
                 else
                   @user.respond_to?(:send_reset_password_instructions) && @user.send_reset_password_instructions
                 end
            status(400) unless rp
            { pwd: pwd, rp: rp, email: @user.email }
          end

          # desc: manage user roles saved in user profile
          namespace :profile do
            desc 'get user profile'
            get do
              @user.profile
            end

            desc 'update user profile'
            params do
              optional :is_templates_moderator, type: Boolean,
                                                desc: 'enable or disable ketcherails template moderation'
              optional :molecule_editor, type: Boolean, desc: 'enable or disable molecule moderation'
              optional :converter_admin, type: Boolean, desc: 'converter profile'
              optional :auth_generic_admin, type: Hash do
                optional :elements, type: Boolean, desc: 'un-authorize the user as generic elements admin'
                optional :segments, type: Boolean, desc: 'un-authorize the user as generic segments admin'
                optional :datasets, type: Boolean, desc: 'un-authorize the user as generic datasets admin'
              end
            end

            put do
              profile = @user.profile
              pdata = profile.data || {}
              case params[:is_templates_moderator]
              when true, false
                pdata = pdata.merge('is_templates_moderator' => params[:is_templates_moderator])
              end

              case params[:converter_admin]
              when true, false
                pdata = pdata.merge('converter_admin' => params[:converter_admin])
              end

              case params[:molecule_editor]
              when true, false
                pdata = pdata.merge('molecule_editor' => params[:molecule_editor])
              end

              if params[:auth_generic_admin].present?
                pdata = pdata.deep_merge('generic_admin' => params[:auth_generic_admin])
              end

              profile.update!(data: pdata)
              present @user, with: Entities::UserEntity
            end
          end
          # rubocop:enable Rails/HelperInstanceVariable
        end
      end
      resource :matrix do
        desc 'Find all matrices'
        get do
          present Matrice.all.order('id'), with: Entities::MatriceEntity, root: 'matrices'
        end

        desc 'update matrice'
        params do
          requires :id, type: Integer, desc: 'Matrice ID'
          optional :label, type: String, desc: 'Matrice label'
          optional :enabled, type: Boolean, desc: 'globally enabled'
          optional :include_ids, type: Array, desc: 'include_ids'
          optional :exclude_ids, type: Array, desc: 'exclude_ids'
          optional :configs, type: Hash, desc: 'configs'
        end
        put do
          attributes = declared(params, include_missing: false)
          matrice = Matrice.find(params.delete(:id))
          begin
            matrice.update!(attributes) unless attributes.empty?
            load Rails.root.join('config/initializers/devise.rb') if params[:configs].present?
            status 201
          rescue ActiveRecord::RecordInvalid => e
            if params[:configs].present?
              Rails.logger.error ['update_json', e.message,
                                  *e.backtrace].join($INPUT_RECORD_SEPARATOR)
            end
            { error: e.message }
          end
        rescue ActiveRecord::RecordNotFound
          error!('404 Not found', 404) unless matrice
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
