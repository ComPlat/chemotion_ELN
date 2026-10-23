# frozen_string_literal: true

# rubocop:disable Metrics/ClassLength

module Chemotion
  # Admin endpoints of the external inventory integration: inventory collections, connections and
  # their mapping versions. Everything but the adapter list needs the feature enabled by IT.
  class AdminInventoryIntegrationAPI < Grape::API
    rescue_from ActiveRecord::RecordNotFound do
      error!('Not found', 404)
    end
    rescue_from ActiveRecord::StaleObjectError, ActiveRecord::RecordNotUnique do
      error!('The connection was changed by someone else; reload it', 409)
    end
    rescue_from ActiveRecord::RecordInvalid do |error|
      error!({ error: error.record.errors.full_messages.join('; ') }, 422)
    end
    rescue_from InventoryIntegration::Errors::Error do |error|
      error!({ error: InventoryIntegration::Redactor.redact(error.message), code: error.code }, 422)
    end

    helpers do
      def integration_config
        InventoryIntegration::IntegrationConfig.current
      end

      def require_enabled!
        error!('The inventory integration is not enabled on this server', 404) unless integration_config.enabled?
      end

      def connection_setup(connection)
        InventoryIntegration::ConnectionSetup.new(connection, actor: current_user, config: integration_config)
      end

      def find_connection
        InventoryIntegration::Connection.current.find(params[:id])
      end

      # Hash params as plain hashes, so they are stored as given; null keeps the stored value.
      def connection_params
        declared(params, include_missing: false).to_h.except('id').tap do |values|
          %w[settings credentials field_authority].each do |key|
            params[key].nil? ? values.delete(key) : values[key] = params[key].to_h
          end
        end
      end

      def present_connection(connection)
        present connection, with: Entities::InventoryConnectionEntity, root: :connection
      end

      def designated_collection
        return Collection.find(params[:collection_id]) if params[:collection_id]

        owner = Person.find(params[:owner_id])
        Usecases::Collections::Create.new(owner).perform!(parent_id: nil, label: params[:label], inventory_id: nil)
      end
    end

    resource :admin do
      namespace :inventory_integration do
        before do
          error!('401 Unauthorized', 401) unless current_user.is_a?(Admin)
        end

        desc 'Adapters this server enables, with their settings schemas and allowed hosts'
        get :adapters do
          config = integration_config
          error!({ enabled: false, status: 'misconfigured', errors: config.errors }, 503) if config.misconfigured?

          adapters = InventoryIntegration::AdapterRegistry.enabled(config).map do |adapter|
            manifest = adapter.manifest
            manifest.slice(:key, :name, :version, :capabilities, :change_detection, :mapping, :default_preset,
                           :settings_schema).merge(allowed_hosts: config.allowed_hosts(manifest[:key]))
          end
          { enabled: config.enabled?, status: config.status.to_s, adapters: adapters,
            credential_refs: config.enabled? ? config.credential_refs.keys : [] }
        end

        namespace :inventories do
          before { require_enabled! }

          desc 'Inventory collections'
          get do
            inventories = InventoryIntegration::ManagedCollection.includes(:connection, collection: :user)
                                                                 .order(:archived_at, :created_at)
            present inventories, with: Entities::InventoryCollectionEntity, root: :inventories
          end

          desc "A person's collections that can become inventories"
          params do
            requires :owner_id, type: Integer
          end
          get :candidates do
            taken = InventoryIntegration::ManagedCollection.active.select(:collection_id)
            collections = Person.find(params[:owner_id]).collections.where(is_locked: false)
                                .where.not(id: taken).order(:label)
            { collections: collections.map { |collection| collection.slice(:id, :label, :ancestry) } }
          end

          desc 'Make an existing collection an inventory, or create one for a person'
          params do
            optional :collection_id, type: Integer
            optional :owner_id, type: Integer
            optional :label, type: String
            exactly_one_of :collection_id, :owner_id
            all_or_none_of :owner_id, :label
          end
          post do
            inventory = ApplicationRecord.transaction do
              collection = designated_collection
              record = InventoryIntegration::ManagedCollection.find_or_initialize_by(collection: collection)
              if record.persisted? && !record.archived?
                raise InventoryIntegration::Errors::ConfigurationError, 'This collection already is an inventory'
              end

              record.update!(archived_at: nil, created_by: record.created_by || current_user)
              record.tap(&:mark_inventory_samples!)
            end
            present inventory, with: Entities::InventoryCollectionEntity, root: :inventory
          end

          desc 'Stop treating a collection as an inventory; its samples and shares stay'
          put ':id/archive' do
            inventory = InventoryIntegration::ManagedCollection.find(params[:id])
            error!({ error: 'Archive the connection of this inventory first' }, 422) if inventory.connection

            inventory.update!(archived_at: Time.current)
            present inventory, with: Entities::InventoryCollectionEntity, root: :inventory
          end
        end

        namespace :connections do
          before { require_enabled! }

          desc 'Current connections'
          get do
            connections = InventoryIntegration::Connection.current.includes(managed_collection: :collection)
                                                          .order(:created_at)
            present connections, with: Entities::InventoryConnectionEntity, root: :connections
          end

          desc 'Create a connection for an inventory collection (draft until tested and activated)'
          params do
            requires :managed_collection_id, type: Integer
            requires :adapter_key, type: String
            requires :name, type: String
            optional :base_url, type: String
            optional :settings, type: Hash
            optional :credentials, type: Hash, desc: 'Secret settings; write-only'
            optional :credentials_ref, type: String, desc: 'Name of a credential IT configured'
            optional :profile, type: String
            optional :allowed_sharee_ids, type: Array[Integer]
            optional :field_authority, type: Hash
          end
          post do
            inventory = InventoryIntegration::ManagedCollection.active.find(params[:managed_collection_id])
            connection = InventoryIntegration::Connection.new(managed_collection: inventory)
            present_connection(connection_setup(connection).update!(connection_params.except('managed_collection_id')))
          end

          route_param :id, type: Integer do
            desc 'Change a connection; blank credential fields keep their stored value'
            params do
              requires :lock_version, type: Integer
              optional :name, type: String
              optional :base_url, type: String
              optional :settings, type: Hash
              optional :credentials, type: Hash
              optional :credentials_ref, type: String
              optional :profile, type: String
              optional :allowed_sharee_ids, type: Array[Integer]
              optional :field_authority, type: Hash
            end
            put do
              connection = find_connection
              connection.lock_version = params[:lock_version]
              present_connection(connection_setup(connection).update!(connection_params.except('lock_version')))
            end

            desc 'Test the connection with its current settings'
            post :test do
              present_connection(connection_setup(find_connection).test!)
            end

            desc 'Activate a tested connection'
            post :activate do
              present_connection(connection_setup(find_connection).activate!)
            end

            desc 'Pause a connection'
            post :pause do
              present_connection(connection_setup(find_connection).pause!)
            end

            desc 'Archive a connection'
            delete do
              connection_setup(find_connection).archive!
              status 204
              body false
            end

            namespace :mapping_versions do
              desc 'Mapping versions of the connection, newest first'
              get do
                versions = find_connection.mapping_versions.order(version: :desc)
                present versions, with: Entities::InventoryMappingVersionEntity, root: :mapping_versions
              end

              desc "Draft a mapping version, or the adapter's built-in mapping"
              params do
                optional :mapping, type: Hash
                optional :request_settings, type: Hash
                optional :based_on_version_id, type: Integer
                optional :preset, type: Boolean
                exactly_one_of :mapping, :preset
              end
              post do
                connection = find_connection
                service = InventoryIntegration::MappingVersions.new(connection, actor: current_user)
                version = if params[:preset]
                            service.draft_preset!(InventoryIntegration::AdapterRegistry.find(connection.adapter_key))
                          else
                            based_on = connection.mapping_versions.find_by(id: params[:based_on_version_id])
                            service.draft!(mapping: params[:mapping].to_h,
                                           request_settings: params[:request_settings]&.to_h, based_on: based_on)
                          end
                present version, with: Entities::InventoryMappingVersionEntity, root: :mapping_version
              end

              route_param :version_id, type: Integer do
                desc 'Accept a valid draft as the active mapping'
                post :accept do
                  connection = find_connection
                  version = connection.mapping_versions.find(params[:version_id])
                  InventoryIntegration::MappingVersions.new(connection, actor: current_user).accept!(version)
                  present version, with: Entities::InventoryMappingVersionEntity, root: :mapping_version
                end

                desc 'Discard a draft; it stays for the history'
                post :discard do
                  connection = find_connection
                  version = connection.mapping_versions.find(params[:version_id])
                  InventoryIntegration::MappingVersions.new(connection, actor: current_user).discard!(version)
                  present version, with: Entities::InventoryMappingVersionEntity, root: :mapping_version
                end
              end
            end
          end
        end
      end
    end
  end
end
# rubocop:enable Metrics/ClassLength
