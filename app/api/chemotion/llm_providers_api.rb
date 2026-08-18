# frozen_string_literal: true

module Chemotion
  # CRUD for the LLM providers a user owns — the endpoints behind the "My
  # providers" list in AI settings. Split from LlmSettingsAPI (which owns the
  # user's *preference*: which provider answers a task that names none) because
  # they are two resources, not one.
  class LlmProvidersAPI < Grape::API
    resource :users do
      helpers do
        # Everything about a provider EXCEPT its key, which never leaves the
        # server in readable form.
        def present_llm_provider(provider)
          {
            id:             provider.id,
            name:           provider.name,
            api_protocol:   provider.api_protocol,
            base_url:       provider.base_url,
            default_model:  provider.default_model,
            api_key_masked: provider.api_key_masked,
            enabled:        provider.enabled,
            scope:          provider.scope,
          }
        end

        # The LlmModelCatalog cache identity described by a provider.
        def llm_catalog_identity(provider)
          {
            base_url: provider.base_url,
            api_key:  provider.api_key,
            protocol: provider.api_protocol,
          }
        end

        # Personal providers are looked up through the user's own scope, never by
        # bare id: an id from another user must read as "not found", not as a
        # provider whose key we then spend.
        def find_own_llm_provider!(id)
          provider = LlmProvider.for_user(current_user).find_by(id: id)
          error!({ error: 'Provider not found.' }, 404) unless provider
          provider
        end

        def ensure_personal_providers_allowed!
          return if LlmProviderResolver.user_api_key_allowed?(current_user)

          error!({ error: 'You are not permitted to configure your own AI provider. Contact your administrator.' },
                 403)
        end
      end

      # ── The user's own providers ─────────────────────────────────────────────
      #
      # Each row is one endpoint the user may send requests to, with its own
      # protocol, model and key. Every action here is scoped to current_user:
      # a personal provider is reachable by nobody else, by id or otherwise.
      namespace :llm_providers do
        desc 'List my own LLM providers (keys masked)'
        get do
          { providers: LlmProvider.for_user(current_user).map { |p| present_llm_provider(p) } }
        end

        desc 'Add one of my own LLM providers'
        params do
          requires :name,          type: String, desc: 'Label shown in my provider list'
          requires :api_protocol,  type: String, values: LlmProvider::API_PROTOCOLS
          requires :default_model, type: String, desc: 'Model used unless a task names another'
          optional :base_url,      type: String, desc: 'Required for the Chat Completions API'
          optional :api_key,       type: String
        end
        post do
          ensure_personal_providers_allowed!

          provider = LlmProvider.new(
            declared(params, include_missing: false).merge(scope: 'user', user: current_user, enabled: true),
          )
          provider.save!

          # The first provider a user adds becomes the one their tasks default to.
          # Their institution-vs-own choice is deliberately NOT changed here —
          # adding a provider is not the same as switching to it.
          setting = current_user.user_llm_setting || UserLlmSetting.new(user: current_user)
          setting.update!(default_llm_provider: provider) if setting.default_llm_provider_id.blank?

          LlmModelCatalog.invalidate(**llm_catalog_identity(provider))
          { success: true, provider: present_llm_provider(provider) }
        rescue ActiveRecord::RecordInvalid => e
          error!(e.message, 422)
        end

        route_param :id, type: Integer do
          desc 'Update one of my own providers'
          params do
            optional :name,          type: String
            optional :api_protocol,  type: String, values: LlmProvider::API_PROTOCOLS
            optional :default_model, type: String
            optional :base_url,      type: String
            optional :api_key,       type: String, desc: 'Blank leaves the stored key untouched'
            optional :enabled,       type: Boolean
          end
          put do
            ensure_personal_providers_allowed!
            provider = find_own_llm_provider!(params[:id])

            # The catalogue is cached per protocol + endpoint + key digest, so the
            # entry for the identity being left behind is now unreachable from the
            # UI but would still be served if the user edited their way back to it
            # within the TTL.
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

          desc 'Delete one of my own providers'
          delete do
            ensure_personal_providers_allowed!
            provider = find_own_llm_provider!(params[:id])
            identity = llm_catalog_identity(provider)

            # The database does the rest: task overrides naming this provider are
            # removed with it (they would otherwise point at nothing), and the
            # default-provider preference is nulled.
            provider.destroy!
            LlmModelCatalog.invalidate(**identity)

            { success: true }
          end

          desc 'Test one of my own providers with a minimal chat call'
          post :verify do
            ensure_personal_providers_allowed!
            provider = find_own_llm_provider!(params[:id])

            LlmClient.new(
              base_url: provider.base_url,
              api_key:  provider.api_key,
              model:    provider.default_model,
              protocol: provider.api_protocol,
            ).chat(messages: [{ role: 'user', content: 'Reply with a single word: OK' }], max_tokens: 64)

            { success: true, message: 'Connection verified successfully.' }
          rescue Errors::LlmNotConfiguredError => e
            error!(e.message, 422)
          rescue Errors::LlmAuthenticationError => e
            error!(e.message, 401)
          rescue Errors::LlmProviderError => e
            error!(e.message, 502)
          end

          desc 'List the models one of my own providers offers'
          params do
            optional :refresh, type: Boolean, default: false
          end
          post :models do
            provider = find_own_llm_provider!(params[:id])
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
