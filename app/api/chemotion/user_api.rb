
# frozen_string_literal: true
module Chemotion
  class UserAPI < Grape::API

    resource :users do

      desc 'Find top 3 matched user names'
      params do
        requires :name, type: String
      end
      get 'name' do
        unless params[:name].nil? || params[:name].empty?
          { users: User.where(type: %w(Person Group)).by_name(params[:name]).limit(3)
                       .select('first_name','last_name','name','id','name_abbreviation', 'name_abbreviation as abb', 'type as user_type')}
        else
          { users: [] }
        end
      end

      desc 'Return current_user'
      get 'current' do
        present current_user, with: Entities::UserEntity, root: 'user'
      end

      desc 'Log out current_user'
      delete 'sign_out' do
        status 204
      end
    end

    resource :groups do
      rescue_from ActiveRecord::RecordInvalid do |error|
        message = error.record.errors.messages.map { |attr, msg|
          "%s %s" % [attr, msg.first]
        }
        error!(message.join(', '), 404)
      end

      namespace :create do
        desc 'create a group of persons'
        params do
          requires :group_param, type: Hash do
            requires :first_name, type: String
            requires :last_name, type: String
            optional :email, type: String, regexp: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
            requires :name_abbreviation, type: String
            optional :users, type: Array[Integer]
          end
        end

        after_validation do
          users = params[:group_param][:users] || []
          @group_params = declared(params, include_missing: false).symbolize_keys[:group_param]
          @group_params[:email] ||= "%i@eln.edu" % [Time.now.getutc.to_i]
          @group_params[:password] = Devise.friendly_token.first(8)
          @group_params[:password_confirmation] = @group_params[:password]
          @group_params[:users] = User.where(id: [current_user.id] + users)
          @group_params[:admins] = User.where(id: current_user.id)
        end

        post do
          new_group = Group.new(@group_params)
          present new_group, with: Entities::GroupEntity, root: 'group' if new_group.save!
        end
      end

      namespace :qrycurrent do
        desc 'fetch groups of current user'
        get do
          data = current_user.groups | current_user.administrated_accounts
                                              .where(type: 'Group').uniq
          present data, with: Entities::GroupEntity, root: 'currentGroups'
        end
      end

      namespace :upd do
        desc 'update a group of persons'
        params do
          requires :id, type: Integer
          optional :rm_users, type: Array
          optional :add_users, type: Array
          optional :destroy_group, type: Boolean, default: false
        end

        after_validation do
          if current_user.administrated_accounts.where(id: params[:id]).empty? &&
             !params[:rm_users].nil? && current_user.id != params[:rm_users][0]
            error!('401 Unauthorized', 401)
          end
        end

        put ':id' do
          group = Group.find(params[:id])
          if params[:destroy_group]
            { destroyed_id: params[:id] } if group.destroy!
          else
            new_users =
              (params[:add_users] || []).map(&:to_i) - group.users.pluck(:id)
            rm_users = (params[:rm_users] || []).map(&:to_i)
            group.users << Person.where(id: new_users)
            group.save!
            group.users.delete(User.where(id: rm_users))
            group
            present group, with: Entities::GroupEntity, root: 'group'
          end
        end
      end
    end

    resource :devices do
      params do
        optional :id, type: String, regexp: /\d+/, default: '0'
        optional :status, type: String
      end

      get :novnc do
        devices = Device.by_user_ids(user_ids).novnc.includes(:profile)
        present devices, with: Entities::DeviceNovncEntity, root: 'devices'
      end

      get 'current_connection' do
        path = Rails.root.join('tmp/novnc_devices', params[:id])
        cmd = "echo '#{current_user.id},#{params[:status] == 'true' ? 1 : 0}' >> #{path};LINES=$(tail -n 8 #{path});echo \"$LINES\" | tee #{path}"
        { result: Open3.popen3(cmd) { |i, o, e, t| o.read.split(/\s/) } }
      end
    end
  end
end
