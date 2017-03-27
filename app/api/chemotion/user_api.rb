module Chemotion
  class UserAPI < Grape::API

    resource :users do

      desc "Return all users"
      get do
        User.all
      end

      desc "Return current_user"
      get 'current', serializer: UserSerializer do
        current_user
      end

      desc "Log out current_user"
      delete 'sign_out' do
        status 204
      end

      namespace :layout do
        desc "Update user layout"
        params do
          requires :layout, type: Hash
        end

        post do
          current_user.layout = params[:layout]
          visible_count = current_user.layout.find_all{ |key, value|
            value.to_i > 0
          }.count

          current_user.layout = {
            sample: 1,
            reaction: 2,
            wellplate: 3,
            screen: 4,
            research_plan: 5
          } if current_user.layout.size == 0 || visible_count == 0

          current_user.save!

          current_user.layout
        end

      end

    end

    resource :groups do
      rescue_from ActiveRecord::RecordInvalid do |error|
        message = error.record.errors.messages.map { |attr, msg| "%s %s" %[attr,msg.first] }
        error!(message.join(", "), 404)
      end
      namespace :create do
      desc "create a group of persons"
      params do
        requires :group_param, type: Hash do
          requires :first_name, type: String
          requires :last_name, type: String
          optional :email, type: String, regexp: /.+@.+/
          requires :name_abbreviation, type: String
          optional :users, type: Array, default: []
        end
      end
      before do
        params[:group_param]||={}
        params[:group_param][:email] ||= "%i@eln.com" % [Time.now.getutc.to_i]
        params[:group_param][:password] = Devise.friendly_token.first(8)
        params[:group_param][:password_confirmation] = params[:group_param][:password]

      end

      post do
        user_ids = (params[:group_param][:users] + [current_user.id]).map{|i| i.to_i}.uniq
        params[:group_param][:users] = User.where(id: user_ids)
        params[:group_param][:admins]= User.where(id: current_user.id)
        new_group = Group.new(params[:group_param])
        if new_group.save!
        end
        new_group
      end
      end
      namespace :upd do
      desc "update a group of persons"
      params do
        requires :id, type: Integer
        optional :rm_users, type: Array
        optional :add_users, type: Array
        optional :destroy_group, type: Boolean, default: false
      end

      before do
        error!('401 Unauthorized', 401) if current_user.administrated_accounts.where(id: params[:id]).empty?
      end

      put ':id' do
        group = Group.find(params[:id])
        if params[:destroy_group]
          if group.destroy!
            {destroyed_id: params[:id]}
          end
        else
          new_users = (params[:add_users]||[]).map{|i| i.to_i} - group.users.pluck(:id)
          rm_users = (params[:rm_users]||[]).map{|i| i.to_i}
          group.users<< Person.where(id: new_users)
          group.save!
          group.users.delete(User.where(id: rm_users))
          group
        end
      end
    end
    end
  end
end
