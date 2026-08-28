# frozen_string_literal: true

module Chemotion
  # CRUD for the institution's LLM providers — the endpoints behind the
  # "Institution providers" list in the admin AI page. The user-facing
  # counterpart is Chemotion::LlmProvidersAPI, which manages a user's own list
  # the same way; the two differ only in who may reach the records.
  class AdminLlmProvidersAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      helpers do
        # The LlmModelCatalog cache identity described by an LlmProvider record.
        def llm_catalog_identity(provider)
          {
            base_url: provider.base_url,
            api_key:  provider.api_key,
            protocol: provider.api_protocol,
          }
        end

        # Everything about a provider EXCEPT its key, which never leaves the
        # server in readable form.
        def present_llm_provider(provider)
          {
            id:              provider.id,
            name:            provider.name,
            api_protocol:    provider.api_protocol,
            base_url:        provider.base_url,
            default_model:   provider.default_model,
            api_key_masked:  provider.api_key_masked,
            enabled:         provider.enabled,
            scope:           provider.scope,
            restrict_models: provider.restrict_models,
            grants:          provider.llm_provider_grants.order(:model).map { |g| present_llm_grant(g) },
          }
        end

        # One access rule, with its user lists resolved to pickable options.
        def present_llm_grant(grant)
          {
            id:            grant.id,
            model:         grant.model,
            enabled:       grant.enabled,
            include_users: llm_users_for_ids(grant.include_ids),
            exclude_users: llm_users_for_ids(grant.exclude_ids),
          }
        end

        # Format a list of user ids into {value, label} option objects.
        def llm_users_for_ids(ids)
          return [] if ids.blank?

          User.where(id: ids).map do |u|
            { value: u.id, label: "#{u.first_name} #{u.last_name} (#{u.name_abbreviation})" }
          end
        end

        # Looked up through the global scope, never by bare id: a personal
        # provider's id must read as "not found" here rather than let an admin
        # edit — or spend — one user's own key.
        def find_institution_provider!(id)
          provider = LlmProvider.where(scope: 'global').find_by(id: id)
          error!({ error: 'Provider not found.' }, 404) unless provider
          provider
        end

        # A minimal chat call, the same one every "Test connection" button makes.
        def llm_test_call(base_url:, api_key:, model:, protocol:)
          error!('No model available for test. Enter a default model first.', 422) if model.blank?
          error!('No base URL available for test.', 422) if base_url.blank? && protocol == 'openai'

          LlmClient.new(base_url: base_url, api_key: api_key, model: model, protocol: protocol)
                   .chat(messages: [{ role: 'user', content: 'Reply with a single word: OK' }], max_tokens: 64)

          { success: true, message: 'Connection verified successfully.' }
        end
      end

      namespace :llm_providers do
        desc 'List the institution providers (keys masked)'
        get do
          { providers: LlmProvider.global_providers.map { |p| present_llm_provider(p) } }
        end

        desc 'Add an institution provider'
        params do
          requires :name,          type: String, desc: 'Label shown to users'
          requires :api_protocol,  type: String, values: LlmProvider::API_PROTOCOLS
          requires :default_model, type: String, desc: 'Model used unless a task names another'
          optional :base_url,      type: String, desc: 'Required for the Chat Completions API'
          optional :api_key,       type: String
          optional :restrict_models, type: Boolean, desc: 'Offer only the models an access rule names'
        end
        post do
          provider = LlmProvider.new(
            declared(params, include_missing: false).merge(scope: 'global', enabled: true),
          )
          provider.save!

          LlmModelCatalog.invalidate(**llm_catalog_identity(provider))
          { success: true, provider: present_llm_provider(provider) }
        rescue ActiveRecord::RecordInvalid => e
          error!(e.message, 422)
        end

        desc 'Test a provider config that has not been saved yet'
        params do
          optional :base_url,      type: String
          optional :api_key,       type: String
          optional :default_model, type: String
          optional :protocol,      type: String, values: LlmProvider::API_PROTOCOLS, desc: 'Wire protocol'
        end
        post :test do
          llm_test_call(
            base_url: params[:base_url].presence,
            api_key:  params[:api_key].presence,
            model:    params[:default_model].presence,
            protocol: params[:protocol].presence || 'openai',
          )
        rescue Errors::LlmNotConfiguredError => e
          error!(e.message, 422)
        rescue Errors::LlmAuthenticationError => e
          error!(e.message, 401)
        rescue Errors::LlmProviderError => e
          error!(e.message, 502)
        end

        route_param :id, type: Integer do
          desc 'Update an institution provider'
          params do
            optional :name,          type: String
            optional :api_protocol,  type: String, values: LlmProvider::API_PROTOCOLS
            optional :default_model, type: String
            optional :base_url,      type: String
            optional :api_key,       type: String, desc: 'Blank leaves the stored key untouched'
            optional :enabled,       type: Boolean
            optional :restrict_models, type: Boolean, desc: 'Offer only the models an access rule names'
          end
          put do
            provider = find_institution_provider!(params[:id])

            # The catalogue cached under the identity being left behind is shared
            # by every user of this provider, so it must not outlive it.
            stale_identity = llm_catalog_identity(provider)

            provider.assign_attributes(declared(params, include_missing: false).except('id'))
            # A stored key belongs to one endpoint. Moving the provider elsewhere
            # without supplying a new key drops it rather than sending it to a
            # host it was never issued for.
            provider.api_key_enc = nil if params[:api_key].blank? &&
                                          (provider.base_url_changed? || provider.api_protocol_changed?)
            provider.save!

            new_identity = llm_catalog_identity(provider)
            LlmModelCatalog.invalidate(**stale_identity) if stale_identity != new_identity
            LlmModelCatalog.invalidate(**new_identity)

            { success: true, provider: present_llm_provider(provider) }
          rescue ActiveRecord::RecordInvalid => e
            error!(e.message, 422)
          end

          desc 'Delete an institution provider'
          delete do
            provider = find_institution_provider!(params[:id])
            identity = llm_catalog_identity(provider)

            # The database does the rest: task overrides naming this provider are
            # removed with it, and every preference pointing at it is nulled —
            # those users fall back to the first remaining institution provider.
            provider.destroy!
            LlmModelCatalog.invalidate(**identity)

            { success: true }
          end

          desc "Delete an institution provider's saved API key"
          delete :api_key do
            provider = find_institution_provider!(params[:id])
            identity = llm_catalog_identity(provider)
            provider.update!(api_key_enc: nil)
            LlmModelCatalog.invalidate(**identity)

            { success: true }
          end

          desc 'Test an institution provider with its stored key'
          post :verify do
            provider = find_institution_provider!(params[:id])
            llm_test_call(
              base_url: provider.base_url,
              api_key:  provider.api_key,
              model:    provider.default_model,
              protocol: provider.api_protocol.presence || 'openai',
            )
          rescue Errors::LlmNotConfiguredError => e
            error!(e.message, 422)
          rescue Errors::LlmAuthenticationError => e
            error!(e.message, 401)
          rescue Errors::LlmProviderError => e
            error!(e.message, 502)
          end

          desc 'Replace this provider’s access rules'
          params do
            requires :grants, type: Array do
              optional :model,       type: String, desc: 'Blank = the rule for the provider itself'
              optional :enabled,     type: Boolean, default: true
              optional :include_ids, type: Array[Integer], default: []
              optional :exclude_ids, type: Array[Integer], default: []
            end
          end
          put :grants do
            provider = find_institution_provider!(params[:id])

            # Replaced as a set: the admin edits one list, and reconciling it row
            # by row would need ids the form never has for a rule it just added.
            LlmProviderGrant.transaction do
              provider.llm_provider_grants.destroy_all
              params[:grants].each do |grant|
                provider.llm_provider_grants.create!(
                  model:       grant[:model].presence,
                  enabled:     grant[:enabled],
                  include_ids: grant[:include_ids] || [],
                  exclude_ids: grant[:exclude_ids] || [],
                )
              end
            end

            { success: true, provider: present_llm_provider(provider.reload) }
          rescue ActiveRecord::RecordInvalid => e
            error!(e.message, 422)
          end

          desc 'List the models an institution provider offers'
          params do
            optional :refresh, type: Boolean, default: false,
                               desc: 'Re-read the catalogue from the provider instead of serving the cached one'
          end
          post :models do
            provider = find_institution_provider!(params[:id])
            # Shares the cached catalogue with GET /api/v1/llm/institution_models —
            # same provider identity, so admin and users never double-fetch it.
            models = LlmModelCatalog.fetch(**llm_catalog_identity(provider), force: params[:refresh])
            { models: models }
          rescue StandardError
            # An unreachable provider is an empty dropdown, not an error the
            # settings form has to render.
            { models: [] }
          end
        end
      end
    end
  end
end
