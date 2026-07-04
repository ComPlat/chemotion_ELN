# frozen_string_literal: true

module Chemotion
  class AdminLlmAPI < Grape::API
    resource :admin do
      before { error!('401 Unauthorized', 401) unless current_user.is_a?(Admin) }

      helpers do
        # Format a list of user ids into {value, label} option objects.
        def llm_users_for_ids(ids)
          return [] if ids.blank?

          User.where(id: ids).map do |u|
            { value: u.id, label: "#{u.first_name} #{u.last_name} (#{u.name_abbreviation})" }
          end
        end

        # Apply enabled/include_ids/exclude_ids changes to a named Matrice gate.
        # +attrs+ only contains the keys the admin actually supplied. Self-healing:
        # creates the gate row if it is missing so the toggle can never no-op.
        def update_matrice_gate(name, attrs)
          return false if attrs.blank?

          matrice = Matrice.find_or_create_by(name: name)
          matrice.enabled     = attrs['enabled']     if attrs.key?('enabled')
          matrice.include_ids = attrs['include_ids'] if attrs.key?('include_ids')
          matrice.exclude_ids = attrs['exclude_ids'] if attrs.key?('exclude_ids')
          matrice.save!
          true
        end
      end

      # ── Global configuration ─────────────────────────────────────────────────

      namespace :llm_config do
        desc 'Return global LLM configuration (provider + both AI access gates)'
        get do
          ai_matrice          = Matrice.find_by(name: 'aiFeatures')
          custom_key_matrice  = Matrice.find_by(name: 'aiUserApiKey')
          institution_matrice = Matrice.find_by(name: 'aiGlobalProvider')
          global_provider     = LlmProvider.global_providers.first

          {
            # aiFeatures gate — legacy master switch (unused)
            global_enabled: ai_matrice&.enabled || false,
            include_users:  llm_users_for_ids(ai_matrice&.include_ids),
            exclude_users:  llm_users_for_ids(ai_matrice&.exclude_ids),

            # aiGlobalProvider gate — may the user use the institution provider
            institution_enabled:       institution_matrice&.enabled || false,
            institution_include_users: llm_users_for_ids(institution_matrice&.include_ids),
            institution_exclude_users: llm_users_for_ids(institution_matrice&.exclude_ids),

            # aiUserApiKey gate — may the user configure a personal API key
            custom_key_enabled:       custom_key_matrice&.enabled || false,
            custom_key_include_users: llm_users_for_ids(custom_key_matrice&.include_ids),
            custom_key_exclude_users: llm_users_for_ids(custom_key_matrice&.exclude_ids),

            provider: global_provider ? {
              id:             global_provider.id,
              name:           global_provider.name,
              api_protocol:   global_provider.api_protocol,
              base_url:       global_provider.base_url,
              api_key_masked: global_provider.api_key_masked,
              default_model:  global_provider.default_model,
              enabled:        global_provider.enabled,
            } : nil,
          }
        end

        desc 'Update global LLM configuration (provider details and/or access gates)'
        params do
          optional :global_enabled,        type: Boolean,        desc: 'Toggle AI features globally'
          optional :include_ids,           type: Array[Integer], desc: 'User IDs explicitly allowed to use AI'
          optional :exclude_ids,           type: Array[Integer], desc: 'User IDs explicitly blocked from AI'
          optional :custom_key_enabled,    type: Boolean,        desc: 'Toggle personal-API-key permission globally'
          optional :custom_key_include_ids, type: Array[Integer], desc: 'User IDs allowed a personal API key'
          optional :custom_key_exclude_ids, type: Array[Integer], desc: 'User IDs blocked from a personal API key'
          optional :institution_enabled,    type: Boolean,        desc: 'Toggle institution-provider access globally'
          optional :institution_include_ids, type: Array[Integer], desc: 'User IDs allowed the institution provider'
          optional :institution_exclude_ids, type: Array[Integer], desc: 'User IDs blocked from the institution provider'
          optional :provider_name,         type: String,         desc: 'Display name for the global provider'
          optional :provider_protocol,     type: String,         values: LlmProvider::API_PROTOCOLS, desc: 'Wire protocol'
          optional :base_url,              type: String,         desc: 'Provider API base URL'
          optional :api_key,               type: String,         desc: 'Provider API key (will be encrypted)'
          optional :default_model,         type: String,         desc: 'Default model identifier'
        end
        put do
          declared_params = declared(params, include_missing: false)

          # aiFeatures gate
          ai_attrs = {}
          ai_attrs['enabled']     = declared_params['global_enabled'] if declared_params.key?('global_enabled')
          ai_attrs['include_ids'] = declared_params['include_ids']    if declared_params.key?('include_ids')
          ai_attrs['exclude_ids'] = declared_params['exclude_ids']    if declared_params.key?('exclude_ids')
          ai_changed = update_matrice_gate('aiFeatures', ai_attrs)

          # aiUserApiKey gate
          key_attrs = {}
          key_attrs['enabled']     = declared_params['custom_key_enabled']     if declared_params.key?('custom_key_enabled')
          key_attrs['include_ids'] = declared_params['custom_key_include_ids'] if declared_params.key?('custom_key_include_ids')
          key_attrs['exclude_ids'] = declared_params['custom_key_exclude_ids'] if declared_params.key?('custom_key_exclude_ids')
          key_changed = update_matrice_gate('aiUserApiKey', key_attrs)

          # aiGlobalProvider gate
          inst_attrs = {}
          inst_attrs['enabled']     = declared_params['institution_enabled']     if declared_params.key?('institution_enabled')
          inst_attrs['include_ids'] = declared_params['institution_include_ids'] if declared_params.key?('institution_include_ids')
          inst_attrs['exclude_ids'] = declared_params['institution_exclude_ids'] if declared_params.key?('institution_exclude_ids')
          inst_changed = update_matrice_gate('aiGlobalProvider', inst_attrs)

          # Create or update the single global LlmProvider
          provider_params = declared_params.slice('base_url', 'default_model', 'api_key')
          if provider_params.any? || params[:provider_name].present? || params[:provider_protocol].present?
            provider = LlmProvider.global_providers.first || LlmProvider.new(enabled: true)
            provider.name = params[:provider_name].presence || provider.name.presence || 'Global LLM Provider'
            provider.api_protocol = params[:provider_protocol] if params[:provider_protocol].present?
            provider.assign_attributes(provider_params)

            # A stored API key belongs to a specific provider identity. If the admin
            # switched the endpoint/protocol without supplying a new key, drop the
            # stale key rather than pairing it with a different provider.
            if provider.persisted? && params[:api_key].blank? &&
               (provider.base_url_changed? || provider.api_protocol_changed?)
              provider.api_key_enc = nil
            end

            provider.save!
          end

          # Rematerialise user matrix bitmasks so gate changes take effect on the
          # frontend (MatrixCheck reads the bitmask, not the Matrice directly).
          User.gen_matrix if ai_changed || key_changed || inst_changed

          { success: true }
        rescue ActiveRecord::RecordInvalid => e
          error!(e.message, 422)
        end

        namespace :test do
          desc 'Test LLM connectivity — uses supplied params or falls back to the saved global provider'
          params do
            optional :base_url,      type: String, desc: 'Override base URL for this test'
            optional :api_key,       type: String, desc: 'Override API key for this test'
            optional :default_model, type: String, desc: 'Override model for this test'
            optional :protocol,      type: String, values: LlmProvider::API_PROTOCOLS, desc: 'Wire protocol'
          end
          post do
            # Prefer form params so admins can test before saving; fall back to the
            # persisted global provider for any missing values.
            provider = LlmProvider.global_providers.first
            protocol = params[:protocol].presence || provider&.api_protocol || 'openai'
            base_url = params[:base_url].presence || provider&.base_url
            api_key  = params[:api_key].presence  || provider&.api_key
            model    = params[:default_model].presence || provider&.default_model

            error!('No model available for test.', 422) if model.nil?
            # Native protocols (anthropic/gemini) default their base URL; openai needs one.
            error!('No base URL available for test.', 422) if base_url.nil? && protocol == 'openai'

            client = LlmClient.new(base_url: base_url, api_key: api_key, model: model, protocol: protocol)
            client.chat(
              messages:   [{ role: 'user', content: 'Reply with a single word: OK' }],
              max_tokens: 64,
            )

            { success: true, message: 'Connection verified successfully.' }
          rescue Errors::LlmNotConfiguredError => e
            error!(e.message, 422)
          rescue Errors::LlmAuthenticationError => e
            error!(e.message, 401)
          rescue Errors::LlmProviderError => e
            error!(e.message, 502)
          end
        end

        namespace :api_key do
          desc 'Delete the saved global provider API key'
          delete do
            provider = LlmProvider.global_providers.first
            provider&.update!(api_key_enc: nil)
            { success: true }
          end
        end

        namespace :models do
          desc 'List available models from the global provider (calls /v1/models)'
          get do
            provider = LlmProvider.global_providers.first
            error!('No global provider configured.', 422) unless provider

            client = LlmClient.new(
              base_url: provider.base_url,
              api_key:  provider.api_key,
              model:    provider.default_model || '',
              protocol: provider.api_protocol,
            )
            { models: client.list_models }
          rescue StandardError => e
            error!(e.message, 502)
          end
        end
      end
    end
  end
end
