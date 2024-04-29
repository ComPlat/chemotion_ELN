# frozen_string_literal: true

require 'sys/filesystem'

# rubocop: disable Metrics/ClassLength
# rubocop:disable Metrics/BlockLength

module Chemotion
  # Publish-Subscription MessageAPI
  class AdminAPI < Grape::API
    helpers AdminHelpers
    resource :admin do
      before do
        error!(401) unless current_user.is_a?(Admin)
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
          { listLocalCollector: Rails.configuration.datacollectors&.localcollectors || [] }
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

        desc 'Synchronize chemotion deviceMetadata to DataCite'
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
          metadata.update!(attributes)
          DataCite.find_and_create_at_chemotion!(metadata.device) if new_record
          present metadata.reload, with: Entities::DeviceMetadataEntity, root: 'device_metadata'
        rescue ActiveRecord::RecordInvalid => e
          { error: e.message }
        end
      end

      namespace :sftpDevice do # rubocop:disable Metrics/BlockLength
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

      namespace :updateDeviceMethod do # rubocop:disable Metrics/BlockLength
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
              optional :selected_user_level, type: Boolean
            end
          end
        end

        after_validation do
          @p_method = params[:data][:method]
          user_level_selected = params.dig(:data, :method_params, :user_level_selected)
          if @p_method.end_with?('local')
            p_dir = if user_level_selected
                      params[:data][:method_params][:dir].gsub(%r{/\{UserSubDirectories\}}, '')
                    else
                      params[:data][:method_params][:dir]
                    end
            @pn = Pathname.new(p_dir)
            error!('Dir is not a valid directory', 500) unless @pn.directory?

            localpath = Rails.configuration.datacollectors.localcollectors.select do |e|
              @pn.realpath.to_path.start_with?(e[:path])
            end.first
            localpath = @pn.realpath.to_path.sub(localpath[:path], '') unless localpath.nil?

            error!('Dir is not in white-list for local data collection', 500) if localpath.nil?

          end

          if @p_method.end_with?('sftp') && user_level_selected
            params[:data][:method_params][:dir].chomp!('/{UserSubDirectories}')
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

      namespace :data_types do
        desc 'Update data types'
        put do
          file_path = Rails.configuration.path_spectra_data_type
          new_data_types = JSON.parse(request.body.read)
          begin
            File.write(file_path, JSON.pretty_generate(new_data_types))
          rescue Errno::EACCES
            error!('Save files error!', 500)
          end
        end
      end

      resource :jobs do
        desc 'list queued delayed jobs'
        get do
          present(
            Delayed::Job.select('id, queue, handler, run_at, failed_at, attempts, priority, last_error'),
            with: Entities::JobEntity,
            root: :jobs
          )
        end

        namespace :restart do
          desc 'restart single (failed) job'
          params do
            requires :id, type: Integer, desc: 'delayed job id'
          end

          put do
            Delayed::Job.find(params[:id]).update_columns(run_at: 1.minutes.from_now, failed_at: nil)

            {} # FE does not use the result
          end
        end
      end
    end
  end
end

# rubocop: enable Metrics/ClassLength
# rubocop: enable Metrics/BlockLength
