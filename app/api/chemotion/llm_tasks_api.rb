# frozen_string_literal: true

module Chemotion
  # REST endpoints exposing the LLM task registry to authenticated users.
  #
  # Routes:
  #   GET  /api/v1/llm/tasks           - list all registered tasks (metadata only, no prompts)
  #   GET  /api/v1/llm/tasks/:name     - get single task metadata
  #
  class LlmTasksAPI < Grape::API
    before { authenticate! }

    helpers do
      # Persist a system notification for the current user, mirroring the
      # ExtractSdsJob / StructureSpectralDataJob pattern (Channel::SYSTEM_NOTIFICATION
      # + Message.create_msg_notification), so spectral task results show up in the
      # "System Notification" bell/panel (NoticeButton.js — reads from MessagesFetcher,
      # i.e. persisted Message rows) — not just as a transient client-side toast.
      # notificationsStore.add on the frontend is ephemeral and never persisted;
      # only a Message row appears there. Without this, an inline task failure (this
      # endpoint returning a 4xx/5xx synchronously) would show a toast the user could
      # never find again, unlike an async job failure (which already persists one via
      # its own after_perform).
      def notify_llm_task_result(message:, level:)
        channel = Channel.find_by(subject: Channel::SYSTEM_NOTIFICATION)
        channel ||= Channel.create!(subject: Channel::SYSTEM_NOTIFICATION, channel_type: 9)

        Message.create_msg_notification(
          message_content: {
            'channel_id'  => channel.id,
            'data'        => message,
            'level'       => level,
            'autoDismiss' => 5,
          },
          message_from: current_user.id,
          message_to: [current_user.id],
        )
      rescue StandardError => e
        Rails.logger.error("[LlmTasksAPI] notification error: #{e.message}")
      end
    end

    namespace :llm do
      resource :tasks do
        desc 'List all registered LLM task definitions (names, categories, execution modes)'
        get do
          Chemotion::LlmTaskRegistry.all.values
                                    .sort_by(&:name)
                                    .map(&:to_h)
        end

        desc 'Get metadata for a specific LLM task'
        params do
          requires :name, type: String, desc: 'Task name (e.g. sds_extraction)'
        end
        get ':name' do
          task = Chemotion::LlmTaskRegistry.find(params[:name])
          task.to_h
        rescue ArgumentError => e
          error!(e.message, 404)
        end
      end

      resource :spectral do
        desc 'Convert one unstructured analytical measurement (NMR/MS/IR/UV-Vis/HPLC) into ' \
             'structured JSON via the spectral_extraction task. Whether this runs inline ' \
             '(synchronous — returns `result` directly) or in the background (delayed_job — ' \
             'returns `{ queued: true }`, poll GET /api/v1/containers/:container_id for the ' \
             'result) is decided entirely by that task\'s `execution_mode` in ' \
             'config/llm_tasks/spectral_extraction.yml — an ELN installation setting, not a ' \
             'per-request client choice.'
        params do
          optional :content, desc: 'Analysis content — a Quill delta (object) or plain text. ' \
                                   'Required unless execution_mode is async.'
          optional :kind, type: String, desc: 'Analysis type (extended_metadata.kind), used to pick the technique'
          optional :container_id, type: Integer,
                                  desc: 'ID of the (already-saved) analysis container. Required when ' \
                                        'execution_mode is async — the background job reads Content from the DB.'
        end
        post :extract do
          task = Chemotion::LlmTaskRegistry.find(SpectralExtractionService::TASK_NAME)

          if task.async?
            if params[:container_id].blank?
              message = 'This analysis must be saved before it can be structured in the ' \
                        'background — please save it first.'
              notify_llm_task_result(message: "Spectral data structuring failed: #{message}", level: 'error')
              error!({ error: message }, 422)
            end

            container = Container.find_by(id: params[:container_id])
            unless container
              notify_llm_task_result(message: 'Spectral data structuring failed: container not found.',
                                     level: 'error')
              error!({ error: 'Container not found' }, 404)
            end

            policy = ElementPolicy.new(current_user, container.root_element)
            unless policy.update?
              notify_llm_task_result(message: 'Spectral data structuring failed: unauthorized.', level: 'error')
              error!({ error: 'Unauthorized' }, 401)
            end

            StructureSpectralDataJob.perform_later(container_id: container.id, user_id: current_user.id)
            { queued: true }
          else
            if params[:content].blank?
              notify_llm_task_result(message: 'Spectral data structuring failed: no content provided.',
                                     level: 'error')
              error!({ error: 'content is required' }, 422)
            end

            result = SpectralExtractionService.call(
              user:    current_user,
              content: params[:content],
              kind:    params[:kind],
            )
            notify_llm_task_result(
              message: 'Spectral data structuring completed successfully.',
              level:   'info',
            )
            {
              technique:       result.technique,
              technique_label: result.technique_label,
              nucleus:         result.nucleus,
              model:           result.model,
              requested_model: result.requested_model,
              result:          result.data,
            }
          end
        rescue SpectralExtractionService::Error, Errors::LlmNotConfiguredError => e
          notify_llm_task_result(message: "Spectral data structuring failed: #{e.message}", level: 'error')
          error!({ error: e.message }, 422)
        rescue Errors::LlmProviderError => e
          # Covers timeout / rate-limit / auth / generic provider errors (all subclasses)
          notify_llm_task_result(message: "Spectral data structuring failed: #{e.message}", level: 'error')
          error!({ error: e.message }, 502)
        end
      end

      resource :provider_profiles do
        desc 'List configurable LLM provider presets (config/llm_provider_profiles.yml)'
        get do
          { profiles: LlmProviderProfiles.all }
        end
      end

      resource :available do
        desc 'Whether an LLM provider is configured for the current user (personal or institution)'
        get do
          LlmProviderResolver.resolve(user: current_user, skip_feature_flags: true)
          { available: true }
        rescue StandardError
          # Includes Errors::LlmNotConfiguredError — the answer to "is a provider
          # available?" is simply no, however the resolution failed.
          { available: false }
        end
      end

      resource :access do
        desc 'Which AI access gates the current user is granted (drives AI-settings visibility)'
        get do
          institution = LlmProviderResolver.institution_provider_allowed?(current_user)
          personal    = LlmProviderResolver.user_api_key_allowed?(current_user)
          {
            institution_allowed: institution,
            personal_allowed:    personal,
            any_allowed:         institution || personal,
          }
        end
      end

      resource :institution_models do
        desc "List the institution (global) provider's models for the Task→Model dropdown"
        params do
          optional :refresh, type: Boolean, default: false,
                             desc: 'Re-read the catalogue from the provider instead of serving the cached one'
        end
        get do
          return { models: [] } unless LlmProviderResolver.institution_provider_allowed?(current_user)

          provider = LlmProvider.global_providers.first
          return { models: [] } unless provider

          # Cached (LlmModelCatalog): every user who opens the AI settings tab asks
          # for this same list, and it is the institution provider that would be hit.
          #
          # `refresh` evicts a cache entry shared by all users of the institution
          # provider, which is why it is only reachable by users the gate already
          # admits, and why the UI only sends it right after a successful Test
          # connection — an action that hits the provider anyway.
          models = LlmModelCatalog.fetch(
            base_url: provider.base_url,
            api_key:  provider.api_key,
            protocol: provider.api_protocol.presence || 'openai',
            force:    params[:refresh],
          )
          { models: models }
        rescue StandardError
          { models: [] }
        end
      end
    end
  end
end
