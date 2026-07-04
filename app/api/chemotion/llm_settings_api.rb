# frozen_string_literal: true

module Chemotion
  class LlmSettingsAPI < Grape::API
    resource :users do
      namespace :llm_settings do
        desc 'Return current user LLM settings (API key masked)'
        get do
          setting        = current_user.user_llm_setting
          task_mappings  = current_user.user_task_model_mappings.order(:task_name)
          admin_provider = LlmProvider.global_providers.first

          {
            setting: {
              provider_type:  setting&.provider_type  || 'global',
              api_protocol:   setting&.api_protocol   || 'openai',
              base_url:       setting&.base_url,
              api_key_masked: setting&.api_key_masked,
              default_model:  setting&.default_model,
              enabled:        setting.nil? ? true : setting.enabled,
            },
            task_mappings: task_mappings.map { |m| { task_name: m.task_name, model: m.model } },
            # SF-03 access gates — drive tab visibility and the provider options.
            ai_features_enabled:        LlmProviderResolver.ai_features_enabled?(current_user),
            ai_user_api_key_allowed:    LlmProviderResolver.user_api_key_allowed?(current_user),
            ai_global_provider_allowed: LlmProviderResolver.institution_provider_allowed?(current_user),
            # Display-only details of the admin provider for the "use institution
            # provider" mode. The API key is never exposed.
            admin_provider: admin_provider ? {
              name:          admin_provider.name,
              api_protocol:  admin_provider.api_protocol,
              base_url:      admin_provider.base_url,
              default_model: admin_provider.default_model,
              enabled:       admin_provider.enabled,
            } : nil,
          }
        end

        desc 'Update current user LLM settings'
        params do
          optional :provider_type,  type: String, values: UserLlmSetting::PROVIDER_TYPES
          optional :api_protocol,   type: String, values: UserLlmSetting::API_PROTOCOLS
          optional :base_url,       type: String
          optional :api_key,        type: String
          optional :default_model,  type: String
          optional :task_mappings,  type: Array do
            requires :task_name, type: String
            requires :model,     type: String
          end
        end
        put do
          # SF-03: enforce the access gates (frontend hides the options; these are
          # the server-side backstops).
          if params[:provider_type] == 'custom' && !LlmProviderResolver.user_api_key_allowed?(current_user)
            error!({ error: 'You are not permitted to configure a personal API key. Contact your administrator.' }, 403)
          end
          if params[:provider_type] == 'global' && !LlmProviderResolver.institution_provider_allowed?(current_user)
            error!({ error: 'You are not permitted to use the institution provider. Contact your administrator.' }, 403)
          end

          setting = current_user.user_llm_setting ||
                    UserLlmSetting.new(user: current_user)

          attrs = declared(params, include_missing: false).except('task_mappings')
          setting.assign_attributes(attrs)

          # A stored key belongs to a specific provider identity. If the user
          # switched endpoint/protocol without supplying a new key, drop the stale
          # key rather than pairing it with a different provider.
          if setting.persisted? && setting.provider_type == 'custom' && params[:api_key].blank? &&
             (setting.base_url_changed? || setting.api_protocol_changed?)
            setting.api_key_enc = nil
          end

          setting.save!

          if params[:task_mappings]
            params[:task_mappings].each do |mapping|
              # reject blank model values (treat as "remove override")
              task_name = mapping[:task_name].to_s.strip
              model     = mapping[:model].to_s.strip
              next if task_name.blank?

              rec = UserTaskModelMapping.find_or_initialize_by(
                user:      current_user,
                task_name: task_name,
              )
              if model.blank?
                rec.destroy if rec.persisted?
              else
                rec.model = model
                rec.save!
              end
            end
          end

          { success: true }
        rescue ActiveRecord::RecordInvalid => e
          error!(e.message, 422)
        end

        namespace :verify do
          desc 'Verify the current (or supplied) LLM API key with a minimal test call'
          params do
            optional :api_key,  type: String
            optional :base_url, type: String
            optional :model,    type: String
            optional :protocol, type: String, values: UserLlmSetting::API_PROTOCOLS
          end
          post do
            # If the caller supplies any custom field, treat it as a direct
            # (pre-save) test of the values on the form. Otherwise this is the
            # "test my institution provider" button — test the GLOBAL provider
            # explicitly (never the user's own custom setting).
            supplied = params[:model].present? || params[:protocol].present? ||
                       params[:base_url].present? || params[:api_key].present?

            if supplied
              protocol = params[:protocol].presence || 'openai'
              base_url = params[:base_url].presence
              model    = params[:model].presence
              # Reuse the saved key when the form left it blank.
              api_key  = params[:api_key].presence || current_user.user_llm_setting&.api_key
            else
              provider = LlmProvider.global_providers.first
              error!({ error: 'No institution provider is configured. Contact your administrator.' }, 422) unless provider

              protocol = provider.api_protocol || 'openai'
              base_url = provider.base_url
              model    = provider.default_model
              api_key  = provider.api_key
            end

            client = LlmClient.new(base_url: base_url, api_key: api_key, model: model, protocol: protocol)
            client.chat(
              messages:   [{ role: 'user', content: 'Reply with a single word: OK' }],
              max_tokens: 64,
            )

            { success: true, message: 'API key verified successfully.' }
          rescue Errors::LlmNotConfiguredError
            error!('No LLM provider configured. Set up a provider first.', 422)
          rescue Errors::LlmAuthenticationError => e
            error!(e.message, 401)
          rescue Errors::LlmProviderError => e
            error!(e.message, 502)
          end
        end

        namespace :models do
          desc 'List models available from the resolved provider (calls the provider models endpoint)'
          get do
            resolution = LlmProviderResolver.resolve(user: current_user, skip_feature_flags: true)
            client = LlmClient.new(
              base_url: resolution.base_url,
              api_key:  resolution.api_key,
              model:    resolution.model || '',
              protocol: resolution.protocol || 'openai',
            )
            { models: client.list_models }
          rescue Errors::LlmNotConfiguredError
            { models: [] }
          rescue StandardError
            { models: [] }
          end

          desc 'List models for a supplied (pre-save) custom config; reuses the saved key when blank'
          params do
            optional :protocol, type: String
            optional :base_url, type: String
            optional :model,    type: String
            optional :api_key,  type: String
          end
          post do
            protocol = params[:protocol].presence || 'openai'
            api_key  = params[:api_key].presence || current_user.user_llm_setting&.api_key
            client = LlmClient.new(
              base_url: params[:base_url].presence,
              api_key:  api_key,
              model:    params[:model].presence || '',
              protocol: protocol,
            )
            { models: client.list_models }
          rescue StandardError
            { models: [] }
          end
        end

        namespace :api_key do
          desc 'Delete the current user’s saved personal API key'
          delete do
            setting = current_user.user_llm_setting
            setting.update!(api_key_enc: nil) if setting&.api_key_enc.present?
            { success: true }
          end
        end
      end
    end
  end
end
