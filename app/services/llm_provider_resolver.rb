# frozen_string_literal: true

# Resolves which LLM provider and model to use for a given user + task.
#
# Three-level fallback hierarchy (first match wins):
#   1. User task-specific mapping  — SF-02 UserTaskModelMapping (task→model string)
#   2. User default provider       — SF-02 UserLlmSetting (custom endpoint + key)
#   3. Global admin provider       — SF-01 LlmProvider with scope:'global'
#
# Feature-flag gates (SF-03):
#   • Matrice 'aiFeatures' must be enabled globally, AND
#   • The user's UserLlmSetting.enabled must be true (defaults to true when no record)
#
class LlmProviderResolver
  # Value object returned by resolve()
  LlmResolution = Struct.new(:provider, :model, :api_key, :base_url, :protocol, keyword_init: true)

  class << self
    # @param user                [User]        The current user
    # @param task_name           [String, nil] Optional task identifier
    # @param skip_feature_flags [Boolean]     Skip Matrice/per-user gate checks (use for
    #                                          connectivity-test calls, not real AI tasks)
    # @return [LlmResolution]
    # @raise [Errors::LlmNotConfiguredError]
    def resolve(user:, task_name: nil, skip_feature_flags: false)
      check_feature_flags!(user) unless skip_feature_flags

      resolution = resolve_user_task_mapping(user, task_name)
      resolution ||= resolve_user_default(user)
      resolution ||= resolve_global if institution_provider_allowed?(user)

      raise Errors::LlmNotConfiguredError,
            'No LLM provider configured. Ask your admin to set up a provider, ' \
            'or add one in Profile → AI Settings.' unless resolution

      resolution
    end

    # Build an LlmClient directly from a resolved provider/model pairing
    def client_for(user:, task_name: nil, timeout: 120, skip_feature_flags: false)
      resolution = resolve(user: user, task_name: task_name, skip_feature_flags: skip_feature_flags)
      LlmClient.new(
        base_url: resolution.base_url,
        api_key:  resolution.api_key,
        model:    resolution.model,
        timeout:  timeout,
        protocol: resolution.protocol || 'openai',
      )
    end

    # ── Feature access checks (SF-03) ─────────────────────────────────────────

    # Whether the user may use AI features at all.
    #
    # NOTE (2026-07): the per-user "AI Feature Access" gate was removed on product
    # request — AI features are available to every user (they still need a working
    # provider to be configured). The `aiFeatures` Matrice is left in the schema,
    # unused. To re-introduce a per-user gate later (e.g. to cap who may spend the
    # shared global API key), restore: `feature_gate_allows?(user, 'aiFeatures')`
    def ai_features_enabled?(_user)
      true
    end

    # Whether the user may configure a personal API key / custom endpoint
    # ('aiUserApiKey' Matrice gate). This gate is active.
    def user_api_key_allowed?(user)
      feature_gate_allows?(user, 'aiUserApiKey')
    end

    # Whether the user may use the institution's global provider
    # ('aiGlobalProvider' Matrice gate). This gate is active.
    def institution_provider_allowed?(user)
      feature_gate_allows?(user, 'aiGlobalProvider')
    end

    private

    # ── Feature-flag gate (SF-03) ──────────────────────────────────────────────

    # AI Feature Access gate disabled — see ai_features_enabled?. Kept as a no-op
    # hook so `resolve` / `skip_feature_flags` wiring stays intact for re-enable.
    def check_feature_flags!(_user)
      nil
    end

    # Shared Matrice gate evaluation. Reads the Matrice directly rather
    # than the pre-computed user bitmask (which may be stale). An absent Matrice
    # is treated as permissive — the feature has simply not been configured yet.
    # Semantics mirror MatrixManagement:
    #   enabled: true  → everyone except exclude_ids
    #   enabled: false → only include_ids
    def feature_gate_allows?(user, matrice_name)
      # Reference Matrice directly (Zeitwerk autoload) rather than gating on
      # `defined?(Matrice)`. With the old `defined?` guard, a fresh process that
      # had not yet loaded Matrice treated EVERY gate as permissive — so the
      # aiUserApiKey / aiGlobalProvider gates were silently bypassed in worker
      # contexts. A genuinely absent Matrice is still treated as permissive
      # (matrice.nil? below, and the NameError rescue for an absent model).
      matrice = Matrice.find_by(name: matrice_name)
      return true if matrice.nil?

      if matrice.enabled
        !(matrice.exclude_ids || []).include?(user.id)
      else
        (matrice.include_ids || []).include?(user.id)
      end
    rescue NameError
      true
    end

    # ── Level 1: Task-specific model override ─────────────────────────────────

    def resolve_user_task_mapping(user, task_name)
      return nil if task_name.blank?
      mapping = UserTaskModelMapping.find_by(user_id: user.id, task_name: task_name)
      return nil unless mapping

      # The mapping only stores a model name string; use the user's provider for
      # the endpoint/key, falling back to global (only if the user may use it).
      base = resolve_user_default(user)
      base ||= resolve_global if institution_provider_allowed?(user)
      return nil unless base

      LlmResolution.new(
        provider: base.provider,
        model:    mapping.model,
        api_key:  base.api_key,
        base_url: base.base_url,
        protocol: base.protocol,
      )
    rescue NameError
      # UserTaskModelMapping model not present in this deployment — no override.
      nil
    rescue StandardError => e
      # Degrade gracefully to the user/global default if the task-mapping lookup
      # errors — but LOG it.
      Rails.logger.warn(
        '[LlmProviderResolver] task-mapping resolution failed for ' \
        "user=#{user&.id} task=#{task_name.inspect}: #{e.class} - #{e.message}. " \
        'Falling back to the default provider/model.',
      )
      nil
    end

    # ── Level 2: User's custom provider ───────────────────────────────────────

    def resolve_user_default(user)
      # Respect the custom-key gate: a user who may not configure a personal
      # provider always falls through to the global provider, even if a stale
      # 'custom' row remains from before the permission was revoked.
      return nil unless user_api_key_allowed?(user)

      # Reference UserLlmSetting directly (Zeitwerk autoload) rather than gating on
      # `defined?(UserLlmSetting)` — see resolve_user_task_mapping. A missing model
      # is handled by the `rescue StandardError` below (NameError degrades to nil).
      setting = UserLlmSetting.find_by(user_id: user.id, enabled: true)
      return nil if setting.nil? || setting.use_global?

      # User has configured their own endpoint; key may be nil (e.g. Ollama)
      LlmResolution.new(
        provider: nil,
        model: setting.default_model.presence || 'default',
        api_key: setting.api_key,
        base_url: setting.base_url,
        protocol: setting.api_protocol,
      )
    rescue StandardError
      nil
    end

    # ── Level 3: Admin-configured global fallback ─────────────────────────────

    def resolve_global
      provider = LlmProvider.global_providers.first
      return nil unless provider

      LlmResolution.new(
        provider: provider,
        model: provider.default_model,
        api_key: provider.api_key,
        base_url: provider.base_url,
        protocol: provider.api_protocol,
      )
    end
  end
end
