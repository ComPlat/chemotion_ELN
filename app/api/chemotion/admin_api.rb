# frozen_string_literal: true

require 'sys/filesystem'

module Chemotion
  # Publish-Subscription MessageAPI
  # rubocop:disable ClassLength
  class AdminAPI < Grape::API
    # rubocop:disable Metrics/BlockLength
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
              optional :number_of_files, type: Integer
            end
          end
        end

        post do
          device = Device.find(params[:id])
          data = device.profile.data || {}
          new_profile = {
            data: data.merge(params[:data] || {})
          }
          device.profile.update!(**new_profile) &&
            new_profile || error!('profile update failed', 500)
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
                 pwd
                 u.send_reset_password_instructions if u.respond_to?(:send_reset_password_instructions)
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
          begin
            attributes = declared(params, include_missing: false)
            new_obj = User.create!(attributes)
            new_obj.profile.update!({data: {}})
            status 201
          rescue ActiveRecord::RecordInvalid => e
            { error: e.message }
          end
        end
      end

      namespace :updateUser do
        desc 'update user account'
        params do
          requires :id, type: Integer, desc: 'user ID'
          requires :email, type: String, desc: 'user email'
          requires :first_name, type: String, desc: 'user first_name'
          requires :last_name, type: String, desc: 'user last_name'
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
        end

        post do
          user = User.find_by(id: params[:user_id])
          case params[:enable]
          when true
            user.unlock_access!()
          when false
            user.lock_access!(send_instructions: false)
          end

          case params[:confirm_user]
          when true
            user.update!(confirmed_at: DateTime.now)
          when false
            user.update!(confirmed_at: nil)
          end

          case params[:is_templates_moderator]
          when true, false
            profile = user.profile
            data = profile.data.merge({ 'is_templates_moderator' => params[:is_templates_moderator] })
            profile.update!(data: data)
          end
          user
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
          [:enableIds, :disableIds].each do |cat|
            next unless params[cat].present?
            term_ids = params[cat].map{|t| t.split('|').first.strip }
            ids = OlsTerm.where(term_id: term_ids).pluck(:id)
            OlsTerm.switch_by_ids(ids, cat == :enableIds)
          end

          result_all = Entities::OlsTermEntity.represent(
            OlsTerm.where(owl_name: params[:owl_name]).arrange_serializable(:order => :label),
            serializable: true
          )
          OlsTerm.write_public_file(params[:owl_name], { ols_terms: result_all })

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
            ).arrange_serializable(:order => :label),
              serializable: true
            ).unshift(
              {'key': params[:owl_name], 'title': '-- Recently selected --', selectable: false, 'children': []}
            )
          OlsTerm.write_public_file("#{params[:owl_name]}.edited", { ols_terms: result })
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
          if extname.match(/\.(owl?|xml)/i)
            owl_name = File.basename(params[:file][:filename], '.*')
            file_path = params[:file][:tempfile].path
            OlsTerm.delete_owl_by_name(owl_name)
            OlsTerm.import_and_create_ols_from_file_path(owl_name, file_path)
            OlsTerm.disable_branch_by(Ols_name: owl_name, term_id: 'BFO:0000002')
            # discrete settings
            nmr_13c = OlsTerm.find_by(owl_name: 'chmo', term_id: 'CHMO:0000595')
            nmr_13c.update!(synonym: '13C NMR') if nmr_13c

            # write original owl
            result = Entities::OlsTermEntity.represent(
              OlsTerm.where(owl_name: owl_name).arrange_serializable(:order => :label),
              serializable: true
            )
            OlsTerm.write_public_file(owl_name, { ols_terms: result })

            # write edited owl
            result = Entities::OlsTermEntity.represent(
              OlsTerm.where(owl_name: owl_name, is_enabled: true).arrange_serializable(:order => :label),
              serializable: true
            ).unshift(
              {'key': params[:name], 'title': '-- Recently selected --', selectable: false, 'children': []}
            )
            OlsTerm.write_public_file("#{owl_name}.edited", { ols_terms: result })

            status 204
          end
        end
      end
    end
  end
end
