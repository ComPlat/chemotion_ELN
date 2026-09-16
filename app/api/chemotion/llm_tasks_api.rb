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
        desc "List one institution provider's models for the Task→Model dropdown"
        params do
          optional :provider_id, type: Integer,
                                 desc: 'Which institution provider; blank = the one that serves me'
          optional :refresh, type: Boolean, default: false,
                             desc: 'Re-read the catalogue from the provider instead of serving the cached one'
        end
        get do
          # Looked up through the global scope: an id belonging to a personal
          # provider must read as "no such institution provider", never as one
          # whose key we then spend on a catalogue lookup.
          provider = if params[:provider_id].present?
                       LlmProvider.global_providers.find_by(id: params[:provider_id])
                     else
                       LlmProviderResolver.institution_provider_for(current_user)
                     end

          # Filtered to what this user's grants admit — the catalogue itself is
          # cached and shared, the filter is per user.
          #
          # `refresh` evicts a cache entry shared by all users of the provider,
          # which is why the UI only sends it right after a successful Test
          # connection — an action that hits the provider anyway.
          models = LlmProviderResolver.institution_models_for(
            current_user, provider, force: params[:refresh]
          )
          { models: models }
        rescue StandardError
          { models: [] }
        end
      end
    end
  end
end
