# frozen_string_literal: true

module Chemotion
  class GroupAPI < Grape::API
    resource :groups do
      rescue_from ActiveRecord::RecordInvalid do |error|
        message = error.record.errors.messages.map do |attr, msg|
          format('%<attr>s %<msg>s', attr: attr, msg: msg.first)
        end
        error!(message.join(', '), 422)
      end

      desc 'create a group of persons'
      params do
        requires :first_name, type: String
        requires :last_name, type: String
        optional :email, type: String, regexp: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
        requires :name_abbreviation, type: String
        optional :users, type: [Integer]
      end
      post do
        users = params[:users] || []
        group_params = declared(params, include_missing: false)
        group_params[:email] ||= format('%<time>i@eln.edu', time: Time.now.getutc.to_i)
        group_params[:password] = Devise.friendly_token.first(8)
        group_params[:password_confirmation] = group_params[:password]
        group_params[:users] = User.where(id: [current_user.id] + users)
        group_params[:admins] = User.where(id: current_user.id)

        new_group = Group.new(group_params)
        present new_group, with: Entities::GroupEntity, root: 'group' if new_group.save!
      end

      desc 'fetch groups of current user'
      get do
        data = current_user.groups | current_user.administrated_accounts.where(type: 'Group').distinct
        present data, with: Entities::GroupEntity, root: 'currentGroups'
      end

      route_param :id, type: Integer do
        rescue_from ActiveRecord::RecordNotFound do
          error!('404 Group not found', 404)
        end

        after_validation do
          @group = Group.find(params[:id])
          @policy = GroupPolicy.new(current_user, @group)
        end

        desc 'destroy a group'
        delete do
          error!('401 Unauthorized', 401) unless @policy.manage?

          @group.destroy!
          { destroyed_id: params[:id] }
        end

        resource :members do
          desc 'add members to a group'
          params do
            requires :user_ids, type: [Integer], desc: 'ids of users to add'
          end
          post do
            error!('401 Unauthorized', 401) unless @policy.manage?

            new_user_ids = params[:user_ids] - @group.users.pluck(:id)
            @group.users << Person.where(id: new_user_ids)
            present @group, with: Entities::GroupEntity, root: 'group'
          end

          route_param :user_id, type: Integer do
            desc 'remove a member from a group, or leave it'
            delete do
              error!('401 Unauthorized', 401) unless @policy.manage? || @policy.leave?(params[:user_id])
              error!('Cannot remove the last admin', 422) if @policy.last_admin?(params[:user_id])

              @group.users.delete(User.where(id: params[:user_id]))
              @group.users_admins.where(admin_id: params[:user_id]).destroy_all
              User.gen_matrix([params[:user_id]])
              present @group, with: Entities::GroupEntity, root: 'group'
            end
          end
        end

        resource :admins do
          route_param :user_id, type: Integer do
            desc 'promote a member to group admin'
            post do
              error!('401 Unauthorized', 401) unless @policy.manage?

              @group.admins << User.where(id: params[:user_id]) unless @group.admins.exists?(id: params[:user_id])
              present @group, with: Entities::GroupEntity, root: 'group'
            end

            desc 'demote a group admin'
            delete do
              error!('401 Unauthorized', 401) unless @policy.manage?
              error!('Cannot remove the last admin', 422) if @policy.last_admin?(params[:user_id])

              @group.users_admins.where(admin_id: params[:user_id]).destroy_all
              present @group, with: Entities::GroupEntity, root: 'group'
            end
          end
        end
      end
    end
  end
end
