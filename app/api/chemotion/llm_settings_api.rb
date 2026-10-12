# frozen_string_literal: true

module Chemotion
  class LlmSettingsAPI < Grape::API
    MAX_TASK_MAPPINGS = 100

    resource :users do
      helpers LlmAccessHelpers

      helpers do
        # Checked before the transaction opens: error! throws, and a throw out of
        # a transaction block commits it on Rails 6.1.
        def ensure_task_mappings_acceptable!(mappings)
          mappings = Array(mappings)
          error!({ error: "At most #{MAX_TASK_MAPPINGS} task overrides." }, 422) if mappings.size > MAX_TASK_MAPPINGS

          unknown = unknown_task_names(mappings)
          error!({ error: "Unknown task: #{unknown.first}" }, 422) if unknown.any?
        end

        # Tasks an override would be stored for that the registry does not define.
        # Clearing a row is allowed whatever its name.
        def unknown_task_names(mappings)
          mappings.reject { |m| m[:model].blank? && m[:llm_provider_id].blank? }
                  .map { |m| m[:task_name].to_s.strip }
                  .reject { |name| name.blank? || Chemotion::LlmTaskRegistry.names.include?(name) }
        end

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

        # A task override is stored when it names a provider, a model, or both, and
        # removed when it names neither — that is how the UI clears a row.
        def apply_task_mapping(mapping)
          task_name = mapping[:task_name].to_s.strip
          return if task_name.blank?

          model       = mapping[:model].to_s.strip
          provider_id = mapping[:llm_provider_id].presence
          rec = UserTaskModelMapping.find_or_initialize_by(user: current_user, task_name: task_name)

          if model.blank? && provider_id.blank?
            rec.destroy if rec.persisted?
            return
          end

          rec.model           = model.presence
          rec.llm_provider_id = provider_id
          rec.save!
        end

        # Display-only details of one institution provider. The API key is never
        # exposed — users are shown where their requests go, not how to spend it.
        def present_institution_provider(provider)
          {
            id:            provider.id,
            name:          provider.name,
            api_protocol:  provider.api_protocol,
            base_url:      provider.base_url,
            default_model: provider.default_model,
            enabled:       provider.enabled,
          }
        end

        # The institution provider a user may test / read models from: the gate
        # first, then any of the ones open to them when they name one, otherwise
        # whichever serves them by default.
        def institution_provider_for_user(id = nil)
          return nil unless LlmProviderResolver.institution_provider_allowed?(current_user)
          return LlmProviderResolver.institution_provider_for(current_user) if id.blank?

          provider = LlmProvider.global_providers.find_by(id: id)
          provider if provider&.grants_access_to?(current_user)
        end

        # The institution providers this user may actually reach — the gate, then
        # each provider's own rule. A provider they may not use has no business
        # in their settings form, let alone in the Task → Provider dropdown.
        def institution_providers_for_user
          return [] unless LlmProviderResolver.institution_provider_allowed?(current_user)

          LlmProvider.global_providers.select { |p| p.grants_access_to?(current_user) }
        end

        # The institution provider's own reply can name its account, so a user is
        # told only what kind of failure it was; the detail goes to the log.
        def institution_test_failure(error)
          Rails.logger.warn("[LlmSettingsAPI] institution provider test failed: #{error.class}: #{error.message}")
          case error
          when Errors::LlmAuthenticationError
            'The institution provider refused its API key. Contact your administrator.'
          when Errors::LlmTimeoutError
            'The institution provider did not answer. Try again later, or contact your administrator.'
          else
            'The institution provider returned an error. Contact your administrator.'
          end
        end
      end

      namespace :llm_settings do
        desc 'Return current user LLM settings (API key masked)'
        get do
          setting       = current_user.user_llm_setting
          task_mappings = current_user.user_task_model_mappings.order(:task_name)
          institution   = institution_providers_for_user

          {
            setting: {
              provider_type:               setting&.provider_type || 'global',
              default_llm_provider_id:     setting&.default_llm_provider_id,
              institution_llm_provider_id: setting&.institution_llm_provider_id,
              enabled:                     setting.nil? || setting.enabled,
            },
            # The user's own providers — the list they can add to, edit and route
            # individual tasks at.
            providers: LlmProvider.for_user(current_user).map { |p| present_llm_provider(p) },
            task_mappings: task_mappings.map do |m|
              { task_name: m.task_name, model: m.model, llm_provider_id: m.llm_provider_id }
            end,
            # SF-03 access gates — drive tab visibility and the provider options.
            ai_features_enabled: LlmProviderResolver.ai_features_enabled?(current_user),
            ai_user_api_key_allowed: LlmProviderResolver.user_api_key_allowed?(current_user),
            ai_global_provider_allowed: LlmProviderResolver.institution_provider_allowed?(current_user),
            # Every provider the admin has set up. A task may name any of them,
            # and one of them answers a task that names none.
            institution_providers: institution.map { |p| present_institution_provider(p) },
          }
        end

        desc 'Update current user LLM settings'
        params do
          optional :provider_type,           type: String, values: UserLlmSetting::PROVIDER_TYPES
          optional :default_llm_provider_id, type: Integer,
                                             desc: 'Which of my own providers answers a task that names none'
          optional :institution_llm_provider_id, type: Integer,
                                                 desc: 'Which institution provider answers a task that names none'
          optional :task_mappings,           type: Array do
            requires :task_name,       type: String
            optional :model,           type: String
            optional :llm_provider_id, type: Integer, desc: 'Provider for this task; blank = my default'
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

          ensure_task_mappings_acceptable!(params[:task_mappings])
          setting = current_user.user_llm_setting ||
                    UserLlmSetting.new(user: current_user)

          # One transaction: a mapping that fails validation must not leave the
          # preference, or the mappings before it, already changed.
          ActiveRecord::Base.transaction do
            setting.assign_attributes(declared(params, include_missing: false).except('task_mappings'))
            setting.save!

            params[:task_mappings]&.each { |mapping| apply_task_mapping(mapping) }
          end

          { success: true }
        rescue ActiveRecord::RecordInvalid, ActiveRecord::InvalidForeignKey => e
          error!(e.message, 422)
        rescue ActiveRecord::RecordNotUnique
          error!({ error: 'Your AI settings were saved from elsewhere at the same time. Reload and try again.' }, 409)
        end

        namespace :verify do
          desc 'Verify the current (or supplied) LLM API key with a minimal test call'
          params do
            optional :api_key,  type: String
            optional :base_url, type: String
            optional :model,    type: String
            optional :protocol, type: String, values: LlmProvider::API_PROTOCOLS
            optional :institution_provider_id, type: Integer,
                                               desc: 'Which institution provider to test; blank = the one I use'
          end
          post do
            # If the caller supplies any custom field, treat it as a direct
            # (pre-save) test of the values on the form — the values as typed,
            # since an unsaved provider has no key on the server yet. Otherwise
            # this is the "test my institution provider" button, which tests the
            # GLOBAL provider explicitly (a saved personal provider is tested
            # through llm_providers/:id/verify, with its own stored key).
            supplied = params[:model].present? || params[:protocol].present? ||
                       params[:base_url].present? || params[:api_key].present?

            if supplied
              # Testing a supplied endpoint IS configuring a personal provider,
              # so it takes the same permission the CRUD routes require.
              ensure_personal_providers_allowed!
              protocol = params[:protocol].presence || 'openai'
              base_url = params[:base_url].presence
              model    = params[:model].presence
              api_key  = params[:api_key].presence
              violation = LlmEndpointPolicy.violation(base_url)
              error!({ error: "The endpoint #{violation}." }, 422) if violation
            else
              provider = institution_provider_for_user(params[:institution_provider_id])
              unless provider
                error!({ error: 'No institution provider is configured. Contact your administrator.' },
                       422)
              end

              protocol = provider.api_protocol || 'openai'
              base_url = provider.base_url
              model    = provider.default_model
              api_key  = provider.api_key
            end
            client = LlmClient.new(base_url: base_url, api_key: api_key, model: model, protocol: protocol,
                                   timeout: LlmClient::INTERACTIVE_TIMEOUT, restrict_endpoint: supplied)
            client.chat(
              messages:   [{ role: 'user', content: 'Reply with a single word: OK' }],
              max_tokens: 64,
            )

            { success: true, message: 'API key verified successfully.' }
          rescue Errors::LlmNotConfiguredError => e
            # Carries the specific reason (no provider at all, or no model set on
            # the one there is) — a generic message would hide which it was.
            error!(e.message, 422)
          rescue Errors::LlmAuthenticationError => e
            error!(supplied ? e.message : institution_test_failure(e), 401)
          rescue Errors::LlmProviderError => e
            error!(supplied ? e.message : institution_test_failure(e), 502)
          end
        end
      end
    end
  end
end
