# frozen_string_literal: true

module Chemotion
  # rubocop:disable Metrics/ClassLength
  class UserAPI < Grape::API
    resource :users do
      desc 'Find top 3 matched user names'
      params do
        requires :name, type: String
        optional :type, type: [String], desc: 'user types',
                        coerce_with: ->(val) { val.split(/[\s|,]+/) },
                        values: %w[Group Person],
                        default: %w[Group Person]
      end
      get 'name' do
        return { users: [] } if params[:name].blank?

        users = User.where(type: params[:type]).by_name(params[:name]).limit(3)
        present users, with: Entities::UserSimpleEntity, root: 'users'
      end

      desc 'Return current_user'
      get 'current' do
        present current_user, with: Entities::UserEntity, root: 'user'
      end

      desc 'list user labels'
      get 'list_labels' do
        labels = UserLabel.my_labels(current_user)
        present labels || [], with: Entities::UserLabelEntity, root: 'labels'
      end

      desc 'list structure editors'
      get 'list_editors' do
        editors = []
        %w[chemdrawEditor marvinjsEditor ketcherEditor].each do |str|
          editors.push(str) if current_user.matrix_check_by_name(str)
        end
        present Matrice.where(name: editors).order('name'), with: Entities::MatriceEntity, root: 'matrices',
                                                            unexpose_include_ids: true, unexpose_exclude_ids: true
      end

      namespace :omniauth_providers do
        desc 'get omniauth providers'
        get do
          { providers: Devise.omniauth_configs.keys, current_user: current_user }
        end
      end

      namespace :save_label do
        desc 'create or update user labels'
        params do
          optional :id, type: Integer
          optional :title, type: String
          optional :description, type: String
          optional :color, type: String
          optional :access_level, type: Integer
        end
        put do
          attr = {
            id: params[:id],
            user_id: current_user.id,
            access_level: params[:access_level] || 0,
            title: params[:title],
            description: params[:description],
            color: params[:color],
          }
          label = nil
          if params[:id].present?
            label = UserLabel.find(params[:id])
            label.update!(attr)
          else
            label = UserLabel.create!(attr)
          end
          present label, with: Entities::UserLabelEntity
        end
      end

      namespace :update_counter do
        desc 'create or update user labels'
        params do
          optional :type, type: String
          optional :counter, type: Integer
        end
        put do
          counters = current_user.counters
          counters[params[:type]] = params[:counter]
          current_user.update(counters: counters)

          present current_user, with: Entities::UserEntity
        end
      end

      namespace :scifinder do
        desc 'scifinder-n credential'
        get do
          present(ScifinderNCredential.find_by(created_by: current_user.id) || {},
                  with: Entities::ScifinderNCredentialEntity)
        end
      end

      namespace :reaction_short_label do
        params do
          requires :reactions_count, type: Integer
          requires :reaction_name_prefix, type: String
        end

        put do
          current_user.reaction_name_prefix = params[:reaction_name_prefix]
          current_user.counters ||= {}
          current_user.counters['reactions'] = params[:reactions_count].to_s
          current_user.save!
        end
      end

      desc 'Log out current_user'
      delete 'sign_out' do
        status 204
      end
    end

    resource :groups do
      rescue_from ActiveRecord::RecordInvalid do |error|
        message = error.record.errors.messages.map do |attr, msg|
          format('%<attr>s %<msg>s', attr: attr, msg: msg.first)
        end
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
            optional :users, type: [Integer]
          end
        end

        after_validation do
          users = params[:group_param][:users] || []
          @group_params = declared(params, include_missing: false).deep_symbolize_keys[:group_param]
          @group_params[:email] ||= format('%i@eln.edu', Time.now.getutc.to_i)
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
          data = current_user.groups | current_user.administrated_accounts.where(type: 'Group').distinct
          present data, with: Entities::GroupEntity, root: 'currentGroups'
        end
      end

      namespace :queryCurrentDevices do
        desc 'fetch devices of current user'
        get do
          data = [current_user.devices + current_user.groups.map(&:devices)].flatten.uniq
          present data, with: Entities::DeviceEntity, root: 'currentDevices'
        end
      end

      namespace :deviceMetadata do
        desc 'Get deviceMetadata by device id'
        params do
          requires :device_id, type: Integer, desc: 'device id'
        end
        route_param :device_id do
          get do
            present DeviceMetadata.find_by(device_id: params[:device_id]), with: Entities::DeviceMetadataEntity,
                                                                           root: 'device_metadata'
          end
        end
      end

      namespace :upd do
        desc 'update a group of persons'
        params do
          requires :id, type: Integer
          optional :rm_users, type: [Integer], desc: 'remove users from group', default: []
          optional :add_users, type: [Integer], desc: 'add users to group', default: []
          optional :add_admin, type: [Integer], desc: 'add admin to group', default: []
          optional :rm_admin, type: [Integer], desc: 'remove admin from group', default: []
          optional :destroy_group, type: Boolean, default: false
        end

        after_validation do
          @group = Group.find_by(id: params[:id])
          @as_admin = @group.administrated_by?(current_user)
          @rm_current_user_id = !@as_admin && params[:rm_users].delete(current_user.id)
          error!('401 Unauthorized', 401) unless @group.administrated_by?(current_user) || @rm_current_user_id
        end

        put ':id' do
          if @rm_current_user_id
            @group.users.delete(User.where(id: @rm_current_user_id))
            User.gen_matrix([@rm_current_user_id])
            present @group, with: Entities::GroupEntity, root: 'group'
          elsif params[:destroy_group]
            @group.destroy! && { destroyed_id: params[:id] }
          else
            # add new admins
            params[:add_admin].delete(@group.admins.pluck(:id)) # ensure that admins are not added twice
            @group.admins << User.where(id: params[:add_admin])
            # remove admins
            # ensure that current_user is not removed from admins when being last admin
            params[:rm_admin].delete(current_user.id) if Group.last.admins.count == 1
            @group.users_admins.where(admin_id: params[:rm_admin]).destroy_all
            # add new users
            params[:add_users].delete(@group.users.pluck(:id))
            @group.users << Person.where(id: params[:add_users])
            # remove users
            @group.users.delete(User.where(id: params[:rm_users]))
            User.gen_matrix(params[:rm_users]) if params[:rm_users].length.positive?

            present @group, with: Entities::GroupEntity, root: 'group'
          end
        end
      end
    end

    resource :devices do
      params do
        optional :id, type: String, regexp: /\d+/, default: '0'
      end

      get :novnc do
        devices = if params[:id] == '0'
                    Device.by_user_ids(user_ids).where.not(novnc_target: nil).group('devices.id').order('devices.name')
                  else
                    Device.by_user_ids(user_ids).where(id: params[:id]).group('devices.id')
                  end
        present devices, with: Entities::DeviceNovncEntity, root: 'devices'
      end

      desc 'Get current connection status for a device'
      params do
        requires :id, type: String, regexp: /\d+/
        optional :status, type: String
      end

      get 'current_connection' do
        # Authorize: ensure device is accessible to current user
        device = Device.by_user_ids(user_ids).find_by(id: params[:id])
        error!('Device not found', 404) unless device

        path = NOVNC_DEVICES_DIR.join(params[:id])
        status = params[:status] == 'true' ? 1 : 0

        lines = File.open(path, File::RDWR | File::CREAT, 0o600) do |f|
          f.flock(File::LOCK_EX)

          lines = f.each_line.map(&:chomp).compact_blank
          lines << "#{current_user.id},#{status}"
          lines = lines.last(8)

          f.rewind
          f.truncate(0)
          f.puts(lines)
          lines
        end

        { result: lines }
      rescue SystemCallError => e
        Rails.logger.error("current_connection: #{e.class} – #{e.message}")
        error!('Internal server error', 500)
    end
  end
  # rubocop:enable Metrics/ClassLength
end
