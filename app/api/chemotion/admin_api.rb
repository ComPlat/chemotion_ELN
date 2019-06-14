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
        stat = Sys::Filesystem.stat("/home")
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
          requires :id, type: Integer, desc: "device id"
        end
        route_param :id do
          get do
            present Device.find(params[:id]), with: Entities::DeviceEntity, root: 'device'
          end
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
            { error: e.message}
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
            { error: e.message}
          end
        end
      end

      namespace :updateAccount do
        desc 'update account'
        params do
          requires :user_id, type: Integer, desc: 'user id'
          optional :enable, type: Boolean, desc: 'enable or disable account'
          optional :is_templates_moderator, type: Boolean, desc: 'enable or disable account'
          optional :confirm_user, type: Boolean, desc: 'confirm account'
        end
        post do
          user = User.find_by(id: params[:user_id]);
          new_profile = {}
          user.unlock_access!() if params[:enable] == true
          user.lock_access!(send_instructions: false) if params[:enable] == false
          new_profile = { is_templates_moderator: params[:is_templates_moderator] } unless params[:is_templates_moderator].nil?
          new_profile = { confirmed_at: DateTime.now } if params[:confirm_user] == true
          new_profile = { confirmed_at: nil } if params[:confirm_user] == false
          user.update!(new_profile) unless new_profile.empty?
          user
        end
      end

      namespace :importOlsTerms do
        desc 'import OLS terms'
        post do
          extname = File.extname(params[:file][:filename])
          if extname.match(/\.(owl?|xml)/i)
            ols_name = params[:file][:filename].split('.').first
            xml_doc = Nokogiri::XML(File.open(params[:file][:tempfile].path)).to_xml
            json_doc = Hash.from_xml(xml_doc).as_json

            all_terms = json_doc['RDF']['Class']

            OlsTerm.where(ols_name: ols_name).destroy_all if all_terms.length > 0
            version_info = json_doc['RDF']['Ontology']
            all_terms.each do |node|
              next if node['id'].nil?
              next if node['deprecated'] == 'true'
              unless node['subClassOf'].nil?
                if (node['subClassOf'].length > 1)
                  subClass = node['subClassOf'][0]["rdf:resource"]  
                else
                  subClass = node['subClassOf']["rdf:resource"]  
                end
              end
              # if node['id'] == 'RXNO:0000024'
              #   node
              #   byebug
              #   node['deprecated'] 
              # end

              ## special case: RXNO:0000024
              if subClass.nil? && node['equivalentClass'] && node['equivalentClass']['Class'] && node['equivalentClass']['Class']['intersectionOf'] && node['equivalentClass']['Class']['intersectionOf']['Description']
                subClass = node['equivalentClass']['Class']['intersectionOf']['Description']["rdf:about"]
              end
              subClassTermId = subClass.split('/').last.gsub('_',':') unless subClass.nil?

              unless node['hasExactSynonym'].nil?
                synonyms = node['hasExactSynonym']
                if synonyms.class == String
                  synonym = synonyms
                  synonyms = [synonyms]
                else
                  synonym = synonyms.sort_by(&:length)[0]
                end
              end
              OlsTerm.create!(ols_name:ols_name, term_id: node['id'], ancestry_term_id: subClassTermId, 
                label: node['label'], synonym: synonym, synonyms: synonyms,
                desc: node['IAO_0000115'], metadata: {klass: node, version: version_info})
            end

            OlsTerm.where(ols_name: ols_name).each do |ols|
              next if ols.ancestry_term_id.nil?
              ancestry = OlsTerm.find_by(ols_name: ols_name, term_id: ols.ancestry_term_id)
              ols.update!(ancestry: ancestry.id) unless ancestry.nil?
            end
          end
        end
      end
    end
  end
end
