# frozen_string_literal: true

require 'sys/filesystem'

module Chemotion
  # Publish-Subscription MessageAPI
  class AdminAPI < Grape::API
    helpers AdminHelpers
    resource :admin do
      before do
        error(401) unless current_user.is_a?(Admin)
      end

      desc 'Check disk space'
      get 'disk' do
        stat = Sys::Filesystem.stat('/home')
        mb_available = stat.block_size * stat.blocks_available / 1024 / 1024
        { percent_used: stat.percent_used.round(2), mb_available: mb_available }
      end

      namespace :listLocalCollector do
        desc 'List all local collectors'
        get 'all' do
          Rails.configuration.datacollectors&.localcollectors || []
        end
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
          requires :id, type: Integer, desc: 'device id'
        end
        route_param :id do
          get do
            present Device.find(params[:id]), with: Entities::DeviceEntity, root: 'device'
          end
        end
      end

      namespace :deviceMetadata do
        desc 'Get deviceMetadata by device id'
        params do
          requires :device_id, type: Integer, desc: 'device id'
        end
        route_param :device_id do
          get do
            present DeviceMetadata.find_by(device_id: params[:device_id]), with: Entities::DeviceMetadataEntity, root: 'device_metadata'
          end
        end

        desc 'Sychronize chemotion deviceMetadata to DataCite'
        params do
          requires :device_id, type: Integer, desc: 'device id'
        end
        route_param :device_id do
          put 'sync_to_data_cite' do
            device = Device.find(params[:device_id])
            DataCite.sync_to_data_cite!(device)
            present device.device_metadata, with: Entities::DeviceMetadataEntity, root: 'device_metadata'
          rescue DataCite::Client::UnprocessableEntity => e
            present(error: "Error from DataCite: #{e.message}")
          rescue DataCite::Syncer::UnwriteableDoiPrefixError => e
            present(error: "DOI #{device.device_metadata.doi} is not writeable at DataCite (system prefix: #{ENV['DATA_CITE_PREFIX']})")
          end
        end

        desc 'create/update device metadata'
        params do
          requires :device_id, type: Integer, desc: 'device id'

          optional :name, type: String, desc: 'device name'
          optional :doi, type: String, desc: 'device doi'
          optional :url, type: String, desc: 'device url'
          optional :landing_page, type: String, desc: 'device landing_page'
          optional :type, type: String, desc: 'device type'
          optional :description, type: String, desc: 'device description'
          optional :publisher, type: String, desc: 'device publisher'
          optional :publication_year, type: Integer, desc: 'device publication year'
          optional :data_cite_state, type: String, desc: 'state'

          optional :owners, desc: 'device owners'
          optional :manufacturers, desc: 'device manufacturers'
          optional :dates, desc: 'device dates'
        end
        post do
          attributes = declared(params, include_missing: false)
          metadata = DeviceMetadata.find_or_initialize_by(device_id: attributes[:device_id])
          new_record = metadata.new_record?
          metadata.update_attributes!(attributes)
          DataCite.find_and_create_at_chemotion!(metadata.device) if new_record
          present metadata.reload, with: Entities::DeviceMetadataEntity, root: 'device_metadata'
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :sftpDevice do
        desc 'Connect device via SFTP'
        params do
          requires :method, type: String
          requires :host, type: String
          requires :user, type: String
          requires :authen, type: String
          optional :key_name, type: String
        end
        post do
          case params[:authen]
          when 'password'
            credentials = Rails.configuration.datacollectors.sftpusers.select do |e|
              e[:user] == params[:user]
            end.first
            raise 'No match user credentials!' unless credentials

            connect_sftp_with_password(
              host: params[:host],
              user: credentials[:user],
              password: credentials[:password]
            )
          when 'keyfile'
            connect_sftp_with_key(params)
          end

          { lvl: 'success', msg: 'Test connection successfully.' }
        rescue StandardError => e
          { lvl: 'error', msg: e.message }
        end
      end

      namespace :removeDeviceMethod do
        desc 'Remove device profile method'
        params do
          requires :id, type: Integer, desc: 'device id'
        end
        post do
          device = Device.find(params[:id])
          data = device.profile.data || {}
          data.delete('method') if data['method']
          data.delete('method_params') if data['method_params']
          device.profile.update!(data: data)
          present device, with: Entities::DeviceEntity, root: 'device'
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
              optional :authen, type: String
              optional :key_name, type: String
              optional :number_of_files, type: Integer
            end
          end
        end

        after_validation do
          @p_method = params[:data][:method]
          if @p_method.end_with?('local')
            p_dir = params[:data][:method_params][:dir]
            @pn = Pathname.new(p_dir)
            error!('Dir is not a valid directory', 500) unless @pn.directory?

            localpath = Rails.configuration.datacollectors.localcollectors.select do |e|
              @pn.realpath.to_path.start_with?(e[:path])
            end.first
            localpath = @pn.realpath.to_path.sub(localpath[:path], '') unless localpath.nil?

            error!('Dir is not in white-list for local data collection', 500) if localpath.nil?

          end
          key_path(params[:data][:method_params][:key_name]) if @p_method.end_with?('sftp') && params[:data][:method_params][:authen] == 'keyfile'
        end

        post do
          device = Device.find(params[:id])
          data = device.profile.data || {}
          params[:data][:method_params][:dir] = @pn.realpath.to_path if @p_method.end_with?('local')
          new_profile = {
            data: data.merge(params[:data] || {})
          }
          device.profile.update!(**new_profile) &&
            new_profile || error!('profile update failed', 500)
        end
      end

      namespace :editNovncSettings do
        desc 'Edit device NoVNC settings'
        params do
          requires :id, type: Integer
          requires :data, type: Hash do
            optional :novnc, type: Hash do
              optional :token, type: String
              optional :target, type: String
              optional :password, type: String
            end
          end
        end
        put do
          profile = Device.find(params[:id]).profile
          if params[:data][:novnc][:target].present?
            updated = profile.data.merge(params[:data] || {})
            profile.update!(data: updated)
          else
            profile.data.delete('novnc')
            profile.save!
          end
          status 204
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
          new_obj = User.create!(attributes)
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
          optional :account_active, type: Boolean, desc: 'active or inactive this user'
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

          if params[:reconfirm_user].present?
            user.update_columns(email: user.unconfirmed_email, unconfirmed_email: nil) if params[:reconfirm_user] == true
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

          user
        end
      end

      namespace :update_element_template do
        desc 'update Generic Element Properties Template'
        params do
          requires :id, type: Integer, desc: 'Element Klass ID'
          optional :label, type: String, desc: 'Element Klass Label'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        post do
          klass = ElementKlass.find(params[:id])
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = 'ElementKlass'
          klass.properties_template = properties
          klass.save!
          klass.reload
          klass.create_klasses_revision(current_user.id) if params[:is_release] == true
          klass
        end
      end

      namespace :create_element_klass do
        desc 'create Generic Element Properties Template'
        params do
          requires :name, type: String, desc: 'Element Klass Name'
          requires :label, type: String, desc: 'Element Klass Label'
          requires :klass_prefix, type: String, desc: 'Element Klass Short Label Prefix'
          optional :icon_name, type: String, desc: 'Element Klass Icon Name'
          optional :desc, type: String, desc: 'Element Klass Desc'
          optional :properties_template, type: Hash, desc: 'Element Klass properties template'
        end
        post do
          uuid = SecureRandom.uuid
          template = { uuid: uuid, layers: {}, select_options: {} }
          attributes = declared(params, include_missing: false)
          attributes[:properties_template]['uuid'] = uuid if attributes[:properties_template].present?
          attributes[:properties_template] = template unless attributes[:properties_template].present?
          attributes[:properties_template]['eln'] = Chemotion::Application.config.version if attributes[:properties_template].present?
          attributes[:properties_template]['klass'] = 'ElementKlass' if attributes[:properties_template].present?
          attributes[:is_active] = false
          attributes[:uuid] = uuid
          attributes[:released_at] = DateTime.now
          attributes[:properties_release] = attributes[:properties_template]
          attributes[:created_by] = current_user.id

          new_klass = ElementKlass.create!(attributes)
          new_klass.reload
          new_klass.create_klasses_revision(current_user.id)
          klass_names_file = Rails.root.join('config', 'klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          File.write(klass_names_file, klasses)

          status 201
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :update_element_klass do
        desc 'update Generic Element Klass'
        params do
          requires :id, type: Integer, desc: 'Element Klass ID'
          optional :label, type: String, desc: 'Element Klass Label'
          optional :klass_prefix, type: String, desc: 'Element Klass Short Label Prefix'
          optional :icon_name, type: String, desc: 'Element Klass Icon Name'
          optional :desc, type: String, desc: 'Element Klass Desc'
          optional :place, type: String, desc: 'Element Klass Place'
        end
        post do
          place = params[:place]
          begin
            place = place.to_i if place.present? && place.to_i == place.to_f
          rescue StandardError
            place = 100
          end
          klass = ElementKlass.find(params[:id])
          klass.label = params[:label] if params[:label].present?
          klass.klass_prefix = params[:klass_prefix] if params[:klass_prefix].present?
          klass.icon_name = params[:icon_name] if params[:icon_name].present?
          klass.desc = params[:desc] if params[:desc].present?
          klass.place = place
          klass.save!
          klass
        end
      end

      namespace :de_active_element_klass do
        desc 'activate or inactive Generic Element Klass'
        params do
          requires :klass_id, type: Integer, desc: 'Element Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Klass'
        end
        post do
          klass = ElementKlass.find(params[:klass_id])
          klass&.update!(is_active: params[:is_active])

          klass_dir = File.join(Rails.root, 'data')
          !File.directory?(klass_dir) && FileUtils.mkdir_p(klass_dir)
          klass_names_file = File.join(klass_dir, 'klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          File.write(klass_names_file, klasses)

          klass
        end
      end

      namespace :delete_element_klass do
        desc 'delete Generic Element Klass'
        params do
          requires :klass_id, type: Integer, desc: 'Element Klass ID'
        end
        post do
          klass = ElementKlass.find(params[:klass_id])
          klass&.destroy!

          klass_dir = File.join(Rails.root, 'data')
          !File.directory?(klass_dir) && FileUtils.mkdir_p(klass_dir)
          klass_names_file = File.join(klass_dir, 'klasses.json')
          klasses = ElementKlass.where(is_active: true)&.pluck(:name) || []
          File.write(klass_names_file, klasses)

          status 201
        end
      end

      namespace :create_segment_klass do
        desc 'create Generic Segment Klass'
        params do
          requires :label, type: String, desc: 'Segment Klass Label'
          requires :element_klass, type: Integer, desc: 'Element Klass Id'
          optional :desc, type: String, desc: 'Segment Klass Desc'
          optional :place, type: String, desc: 'Segment Klass Place', default: '100'
          optional :properties_template, type: Hash, desc: 'Element Klass properties template'
        end
        after_validation do
          @klass = ElementKlass.find(params[:element_klass])
          error!('Klass is invalid. Please re-select.', 500) if @klass.nil?
        end
        post do
          place = params[:place]
          begin
            place = place.to_i if place.present? && place.to_i == place.to_f
          rescue StandardError
            place = 100
          end

          uuid = SecureRandom.uuid
          template = { uuid: uuid, layers: {}, select_options: {} }
          attributes = declared(params, include_missing: false)
          attributes[:properties_template]['uuid'] = uuid if attributes[:properties_template].present?
          template = attributes[:properties_template].present? ? attributes[:properties_template] : template
          template['eln'] = Chemotion::Application.config.version
          template['klass'] = 'SegmentKlass'
          attributes.merge!(properties_template: template, element_klass: @klass, created_by: current_user.id, place: place)
          attributes[:uuid] = uuid
          attributes[:released_at] = DateTime.now
          attributes[:properties_release] = attributes[:properties_template]
          klass = SegmentKlass.create!(attributes)
          klass.reload
          klass.create_klasses_revision(current_user.id)
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :update_segment_klass do
        desc 'update Generic Segment Klass'
        params do
          requires :id, type: Integer, desc: 'Segment Klass ID'
          optional :label, type: String, desc: 'Segment Klass Label'
          optional :desc, type: String, desc: 'Segment Klass Desc'
          optional :place, type: String, desc: 'Segment Klass Place', default: '100'
        end
        after_validation do
          @segment = SegmentKlass.find(params[:id])
          error!('Segment is invalid. Please re-select.', 500) if @segment.nil?
        end
        post do
          place = params[:place]
          begin
            place = place.to_i if place.present? && place.to_i == place.to_f
          rescue StandardError
            place = 100
          end
          attributes = declared(params, include_missing: false)
          attributes.delete(:id)
          attributes[:place] = place
          @segment&.update!(attributes)
        end
      end

      namespace :de_active_segment_klass do
        desc 'activate or inactive Generic Segment Klass'
        params do
          requires :id, type: Integer, desc: 'Segment Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Segment'
        end
        after_validation do
          @segment = SegmentKlass.find(params[:id])
          error!('Segment is invalid. Please re-select.', 500) if @segment.nil?
        end
        post do
          @segment&.update!(is_active: params[:is_active])
        end
      end

      namespace :klass_revisions do
        desc 'list Generic Element Revisions'
        params do
          requires :id, type: Integer, desc: 'Generic Element Klass Id'
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
        end
        get do
          klass = params[:klass].constantize.find_by(id: params[:id])
          list = klass.send("#{params[:klass].underscore}es_revisions") unless klass.nil?
          present list.sort_by(&:released_at).reverse, with: Entities::KlassRevisionEntity, root: 'revisions'
        end
      end

      namespace :list_segment_klass do
        desc 'list Generic Segment Klass'
        params do
          optional :is_active, type: Boolean, desc: 'Active or Inactive Segment'
        end
        get do
          list = SegmentKlass.where(is_active: params[:is_active]) if params[:is_active].present?
          list = SegmentKlass.all unless params[:is_active].present?
          present list.sort_by(&:place), with: Entities::SegmentKlassEntity, root: 'klass'
        end
      end

      namespace :update_segment_template do
        desc 'update Generic Segment Properties Template'
        params do
          requires :id, type: Integer, desc: 'Segment Klass ID'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        after_validation do
          @segment = SegmentKlass.find(params[:id])
          error!('Segment is invalid. Please re-select.', 500) if @segment.nil?
        end
        post do
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = @segment.class.name

          @segment.properties_template = properties
          @segment.save!
          @segment.reload
          @segment.create_klasses_revision(current_user.id) if params[:is_release] == true
          @segment
        end
      end

      namespace :delete_segment_klass do
        desc 'delete Generic Segment Klass'
        route_param :id do
          before do
            @segment = SegmentKlass.find(params[:id])
          end
          delete do
            @segment&.destroy!
          end
        end
      end

      namespace :delete_klass_revision do
        desc 'delete Generic Element Klass'
        params do
          requires :id, type: Integer, desc: 'Revision ID'
          requires :klass_id, type: Integer, desc: 'Klass ID'
          requires :klass, type: String, desc: 'Klass', values: %w[ElementKlass SegmentKlass DatasetKlass]
        end
        post do
          revision = "#{params[:klass]}esRevision".constantize.find(params[:id])
          klass = params[:klass].constantize.find_by(id: params[:klass_id]) unless revision.nil?
          error!('Revision is invalid.', 404) if revision.nil?
          error!('Can not delete the active revision.', 405) if revision.uuid == klass.uuid
          revision&.destroy!
          status 201
        end
      end

      namespace :list_dataset_klass do
        desc 'list Generic Dataset Klass'
        params do
          optional :is_active, type: Boolean, desc: 'Active or Inactive Dataset'
        end
        get do
          list = DatasetKlass.where(is_active: params[:is_active]) if params[:is_active].present?
          list = DatasetKlass.all unless params[:is_active].present?
          present list.sort_by(&:place), with: Entities::DatasetKlassEntity, root: 'klass'
        end
      end

      namespace :de_active_dataset_klass do
        desc 'activate or inactive Generic Dataset Klass'
        params do
          requires :id, type: Integer, desc: 'Dataset Klass ID'
          requires :is_active, type: Boolean, desc: 'Active or Inactive Dataset'
        end
        after_validation do
          @dataset = DatasetKlass.find(params[:id])
          error!('Dataset is invalid. Please re-select.', 500) if @dataset.nil?
        end
        post do
          @dataset&.update!(is_active: params[:is_active])
        end
      end

      namespace :update_dataset_template do
        desc 'update Generic Dataset Properties Template'
        params do
          requires :id, type: Integer, desc: 'Dataset Klass ID'
          requires :properties_template, type: Hash
          optional :is_release, type: Boolean, default: false
        end
        after_validation do
          @klass = DatasetKlass.find(params[:id])
          error!('Dataset is invalid. Please re-select.', 500) if @klass.nil?
        end
        post do
          uuid = SecureRandom.uuid
          properties = params[:properties_template]
          properties['uuid'] = uuid
          properties['eln'] = Chemotion::Application.config.version
          properties['klass'] = @klass.class.name
          @klass.properties_template = properties
          @klass.save!
          @klass.reload
          @klass.create_klasses_revision(current_user.id) if params[:is_release] == true
          @klass
        end
      end

      resource :group_device do
        namespace :list do
          desc 'fetch groups'
          params do
            requires :type, type: String, values: %w[Group Device]
          end
          get do
            data = User.where(type: params[:type])
            present data, with: Entities::GroupDeviceEntity, root: 'list'
          end
        end

        namespace :name do
          desc 'Find top 3 matched user names by type'
          params do
            requires :type, type: String
            requires :name, type: String
          end
          get do
            unless params[:name].nil? || params[:name].empty?
              { users: User.where(type: params[:type]).by_name(params[:name]).limit(3)
                           .select('first_name', 'last_name', 'name', 'id', 'name_abbreviation', 'name_abbreviation as abb', 'type as user_type') }
            end
          end
        end

        namespace :create do
          desc 'create a group of persons'
          params do
            requires :rootType, type: String, values: %w[Group Device]
            requires :first_name, type: String
            requires :last_name, type: String
            optional :email, type: String, regexp: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
            requires :name_abbreviation, type: String
          end
          after_validation do
            @group_params = declared(params, include_missing: false)
            @root_type = @group_params.delete(:rootType)
            @group_params[:email] ||= format('%<time>i@eln.edu', time: Time.now.getutc.to_i)
            @group_params[:password] = Devise.friendly_token.first(8)
            @group_params[:password_confirmation] = @group_params[:password]
          end
          post do
            new_obj = Group.new(@group_params) if %w[Group].include?(@root_type)
            new_obj = Device.new(@group_params) if %w[Device].include?(@root_type)

            begin
              new_obj.save!
              present new_obj, with: Entities::GroupDeviceEntity
            rescue ActiveRecord::RecordInvalid => e
              { error: e.message }
            end
          end
        end

        namespace :update do
          desc 'update a group of persons'
          params do
            requires :action, type: String, values: %w[RootDel NodeDel NodeAdd NodeAdm]
            requires :rootType, type: String, values: %w[Group Device]
            optional :actionType, type: String, values: %w[Person Device Group Adm]
            requires :id, type: Integer
            optional :admin_id, type: Integer
            optional :rm_users, type: Array
            optional :add_users, type: Array
            optional :destroy_obj, type: Boolean, default: false
            optional :set_admin, type: Boolean, default: false
          end
          put ':id' do
            case params[:action]
            when 'RootDel'
              obj = Group.find(params[:id]) if params[:rootType] == 'Group'
              obj = Device.find(params[:id]) if params[:rootType] == 'Device'
              User.find_by(id: params[:id])&.remove_from_matrices if params[:rootType] == 'Group'
              { destroyed_id: params[:id] } if params[:destroy_obj] && obj.destroy!
            when 'NodeAdm'
              ua = UsersAdmin.find_by(user_id: params[:id], admin_id: params[:admin_id])
              UsersAdmin.create!(user_id: params[:id], admin_id: params[:admin_id]) if ua.nil? && params[:set_admin]
              ua.destroy! if params[:set_admin] == false && !ua.nil?
            when 'NodeAdd'
              obj = Group.find(params[:id]) if %w[Group].include?(params[:rootType])
              obj = Device.find(params[:id]) if %w[Device].include?(params[:rootType])
              new_users = (params[:add_users] || []).map(&:to_i) - obj.users.pluck(:id) if %w[Person Group].include?(params[:actionType])
              new_users = (params[:add_users] || []).map(&:to_i) - obj.devices.pluck(:id) if %w[Device].include?(params[:actionType])
              obj.users << Person.where(id: new_users) if %w[Person].include?(params[:actionType])
              obj.users << Group.where(id: new_users) if %w[Group].include?(params[:actionType])
              obj.devices << Device.where(id: new_users) if %w[Device].include?(params[:actionType])
              obj.save!
              present obj, with: Entities::GroupDeviceEntity, root: 'root'
            when 'NodeDel'
              obj = Group.find(params[:id]) if %w[Group].include?(params[:rootType])
              obj = Device.find(params[:id]) if %w[Device].include?(params[:rootType])
              rm_users = (params[:rm_users] || []).map(&:to_i)
              obj.users.delete(User.where(id: rm_users)) if %w[Person].include?(params[:actionType])
              obj.admins.delete(User.where(id: rm_users)) if %w[Group].include?(params[:rootType]) && %w[Person].include?(params[:actionType])
              obj.devices.delete(Device.where(id: rm_users)) if %w[Device].include?(params[:actionType])
              User.gen_matrix(rm_users) if rm_users&.length&.positive?
              present obj, with: Entities::GroupDeviceEntity, root: 'root'
            end
          end
        end
      end

      namespace :olsEnableDisable do
        desc 'Ols Term Enable & Disable'
        params do
          requires :owl_name, type: String, desc: 'owl_name'
          optional :enableIds, type: Array, desc: 'enable term_ids'
          optional :disableIds, type: Array, desc: 'disable term_ids'
        end
        post do
          %i[enableIds disableIds].each do |cat|
            next unless params[cat].present?

            term_ids = params[cat].map { |t| t.split('|').first.strip }
            ids = OlsTerm.where(term_id: term_ids).pluck(:id)
            OlsTerm.switch_by_ids(ids, cat == :enableIds)
          end

          result_all = Entities::OlsTermEntity.represent(
            OlsTerm.where(owl_name: params[:owl_name]).arrange_serializable(order: :label),
            serializable: true
          )
          OlsTerm.write_public_file(params[:owl_name], ols_terms: result_all)

          # rewrite edited json file
          result = Entities::OlsTermEntity.represent(
            OlsTerm.where(owl_name: params[:owl_name], is_enabled: true).select(
              <<~SQL
                id, owl_name, term_id, label, synonym, synonyms, 'desc' as desc,
                case when (ancestry is null) then null else
                  (select array_to_string(array(
                    select id from ols_terms sub join unnest(regexp_split_to_array(ols_terms.ancestry,'/')::int[])
                    with ordinality t(id,ord) using(id) where is_enabled order by t.ord
                  ),'/'))
                end as ancestry
              SQL
            ).arrange_serializable(order: :label),
            serializable: true
          ).unshift(
            'key': params[:owl_name], 'title': '-- Recently selected --', selectable: false, 'children': []
          )
          OlsTerm.write_public_file("#{params[:owl_name]}.edited", ols_terms: result)
          status 204
        end
      end

      resource :matrix do
        namespace :find_user do
          desc 'Find top 5 matched user/group names by type'
          params do
            requires :name, type: String
          end
          get do
            if params[:name].nil? || params[:name].empty?
              { users: [] }
            else
              { users: User.where(type: %w[Person Group]).by_name(params[:name]).limit(5).select('first_name', 'last_name', 'name', 'id', 'name_abbreviation', 'name_abbreviation as abb', 'type as user_type') }
            end
          end
        end

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
              status 201
            rescue ActiveRecord::RecordInvalid => e
              Rails.logger.error ['update_json', e.message, *e.backtrace].join($INPUT_RECORD_SEPARATOR)
              { error: e.message }
            end
          end
        end
      end

      namespace :importOlsTerms do
        desc 'import OLS terms'
        params do
          requires :file, type: File
        end
        post do
          extname = File.extname(params[:file][:filename])
          if /\.(owl?|xml)/i.match?(extname)
            owl_name = File.basename(params[:file][:filename], '.*')
            file_path = params[:file][:tempfile].path
            OlsTerm.delete_owl_by_name(owl_name)
            OlsTerm.import_and_create_ols_from_file_path(owl_name, file_path)
            OlsTerm.disable_branch_by(Ols_name: owl_name, term_id: 'BFO:0000002')
            # discrete settings
            nmr_13c = OlsTerm.find_by(owl_name: 'chmo', term_id: 'CHMO:0000595')
            nmr_13c&.update!(synonym: '13C NMR')

            # write original owl
            result = Entities::OlsTermEntity.represent(
              OlsTerm.where(owl_name: owl_name).arrange_serializable(order: :label),
              serializable: true
            )
            OlsTerm.write_public_file(owl_name, ols_terms: result)

            # write edited owl
            result = Entities::OlsTermEntity.represent(
              OlsTerm.where(owl_name: owl_name, is_enabled: true).arrange_serializable(order: :label),
              serializable: true
            ).unshift(
              'key': params[:name], 'title': '-- Recently selected --', selectable: false, 'children': []
            )
            OlsTerm.write_public_file("#{owl_name}.edited", ols_terms: result)

            status 204
          end
        end
      end

      resource :jobs do
        desc 'list queued delayed jobs'
        get do
          present Delayed::Job.select('id, queue, handler, run_at, failed_at, attempts, priority, last_error'), with: Entities::JobEntity
        end

        namespace :restart do
          desc 'restart single (failed) job'
          params do
            requires :id, type: Integer, desc: 'delayed job id'
          end

          put do
            Delayed::Job.find(params[:id]).update_columns(run_at: 1.minutes.from_now, failed_at: nil)
          end
        end
      end
    end
  end
end
