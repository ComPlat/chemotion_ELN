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
          User.where(type: %w(Person Group)).by_name(params[:name]).limit(3)
              .map do |x|
            {
              name: x.first_name + " " + x.last_name,
              id: x.id,
              abb: x.name_abbreviation
            }
          end
        else
          {users: []}
        end
      end

      desc 'Return current_user'
      get 'current', serializer: UserSerializer do
        current_user
      end

      desc 'Log out current_user'
      delete 'sign_out' do
        status 204
      end

      namespace :layout do
        desc 'Update user layout'
        params do
          requires :layout, type: Hash
        end

        post do
          current_user.layout = params[:layout]
          visible_count = current_user.layout.find_all { |_, value|
            value.to_i.positive?
          }.count
          if current_user.layout.empty? || visible_count.zero?
            current_user.layout = {
              sample: 1,
              reaction: 2,
              wellplate: 3,
              screen: 4,
              research_plan: 5
            }
          end
          current_user.save!
          current_user.layout
        end
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
          @group_params = params[:group_param]
          @group_params[:email] ||= "%i@eln.edu" % [Time.now.getutc.to_i]
          @group_params[:password] = Devise.friendly_token.first(8)
          @group_params[:password_confirmation] = @group_params[:password]
          @group_params[:users] = User.where(id: [current_user.id] + users)
          @group_params[:admins] = User.where(id: current_user.id)
        end

        post do
          new_group = Group.new(@group_params)
          new_group if new_group.save!
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
          if current_user.administrated_accounts.where(id: params[:id]).empty?
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
          end
        end
      end
    end
  end
end
