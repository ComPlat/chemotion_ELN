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

            if %w[Group].include?(@root_type)
              @group_params[:password] = Devise.friendly_token.first(8)
              @group_params[:password_confirmation] = @group_params[:password]
            end
          end
          post do
            new_obj = Group.new(@group_params) if %w[Group].include?(@root_type)
            new_obj = Device.new(@group_params) if %w[Device].include?(@root_type)

            begin
              new_obj.save!
              if new_obj.is_a?(Device)
                present new_obj, with: Entities::DeviceEntity
              else
                present new_obj, with: Entities::GroupDeviceEntity
              end
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
              if %w[Person Group].include?(params[:actionType])
                new_users = (params[:add_users] || []).map(&:to_i) - obj.users.pluck(:id)
              end
              if %w[Device].include?(params[:actionType])
                new_users = (params[:add_users] || []).map(&:to_i) - obj.devices.pluck(:id)
              end
              obj.users << Person.where(id: new_users) if %w[Person].include?(params[:actionType])
              obj.users << Group.where(id: new_users) if %w[Group].include?(params[:actionType])
              obj.devices << Device.where(id: new_users) if %w[Device].include?(params[:actionType])
              obj.save!

              if obj.is_a?(Device)
                present obj, with: Entities::DeviceEntity, root: 'root'
              else
                present obj, with: Entities::GroupDeviceEntity, root: 'root'
              end
            when 'NodeDel'
              obj = Group.find(params[:id]) if %w[Group].include?(params[:rootType])
              obj = Device.find(params[:id]) if %w[Device].include?(params[:rootType])
              rm_users = (params[:rm_users] || []).map(&:to_i)
              obj.users.delete(User.where(id: rm_users)) if %w[Person].include?(params[:actionType])
              if params[:rootType] == 'Group' && params[:actionType] == 'Person'
                obj.admins.delete(User.where(id: rm_users))
              end
              obj.devices.delete(Device.where(id: rm_users)) if %w[Device].include?(params[:actionType])
              User.gen_matrix(rm_users) if rm_users&.length&.positive?

              if obj.is_a?(Device)
                present obj, with: Entities::DeviceEntity, root: 'root'
              else
                present obj, with: Entities::GroupDeviceEntity, root: 'root'
              end
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
            next if params[cat].blank?

            term_ids = params[cat].map { |t| t.split('|').first.strip }
            ids = OlsTerm.where(term_id: term_ids).pluck(:id)
            OlsTerm.switch_by_ids(ids, cat == :enableIds)
          end

          result_all = Entities::OlsTermEntity.represent(
            OlsTerm.where(owl_name: params[:owl_name]).arrange_serializable(order: :label),
            serializable: true,
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
            serializable: true,
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
              serializable: true,
            )
            OlsTerm.write_public_file(owl_name, ols_terms: result)

            # write edited owl
            result = Entities::OlsTermEntity.represent(
              OlsTerm.where(owl_name: owl_name, is_enabled: true).arrange_serializable(order: :label),
              serializable: true,
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
            root: :jobs,
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
