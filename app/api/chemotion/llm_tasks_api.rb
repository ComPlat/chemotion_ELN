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
