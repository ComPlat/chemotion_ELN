# frozen_string_literal: true

# Resolves which LLM provider and model to use for a given user + task.
#
# Everything a request can be sent to is an LlmProvider: scope 'global' is the
# institution provider, scope 'user' is one of the user's own. This picks one of
# them plus a model, first match wins:
#
#   1. The task's own override  — UserTaskModelMapping (provider and/or model)
#   2. The user's default       — UserLlmSetting: the institution provider it
#                                 points at, or the personal provider it does
#   3. The institution provider — the first one, when the user is allowed it
#
# Each step is checked against the gate for the KIND of provider it resolves to,
# so a revoked permission degrades to the next step instead of failing the task.
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

      resolution = resolve_task_override(user, task_name)
      resolution ||= resolve_user_default(user)
      resolution ||= resolve_institution(user)

      unless resolution
        raise Errors::LlmNotConfiguredError,
              'No LLM provider configured. Ask your admin to set up a provider, ' \
              'or add one in Profile → AI Settings.'
      end

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

    # Which of the institution's providers serves this user: the one they picked,
    # or the first one open to them. Nil when the gate denies them or no
    # institution provider admits them.
    #
    # The pick is re-checked on every call — a provider can be disabled, deleted,
    # or have its access rules narrowed long after it was chosen.
    def institution_provider_for(user)
      return nil unless institution_provider_allowed?(user)

      chosen_institution_provider(user) ||
        LlmProvider.global_providers.find { |provider| provider.grants_access_to?(user) }
    end

    # The models of +provider+ this user may pick, filtered from what the
    # provider itself lists. The catalogue is shared across users; the filter is
    # not, which is why it is applied here rather than cached.
    def institution_models_for(user, provider, force: false)
      return [] unless provider && institution_provider_allowed?(user) && provider.grants_access_to?(user)

      catalogue = LlmModelCatalog.fetch(
        base_url: provider.base_url,
        api_key:  provider.api_key,
        protocol: provider.api_protocol.presence || 'openai',
        force:    force,
      )
      provider.models_for(user, catalogue)
    end

    private

    # The institution provider this user picked, when it is still one they may
    # use. Nil for anything else, so the caller falls back to the list.
    def chosen_institution_provider(user)
      provider = UserLlmSetting.find_by(user_id: user.id)&.institution_llm_provider
      return nil unless provider&.enabled && provider.scope == 'global'

      provider.grants_access_to?(user) ? provider : nil
    rescue StandardError
      nil
    end

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
        (matrice.exclude_ids || []).exclude?(user.id)
      else
        (matrice.include_ids || []).include?(user.id)
      end
    rescue NameError
      true
    end

    # ── Level 1: The task's own override ──────────────────────────────────────

    # A mapping may name a provider, a model, or both:
    #   provider + model → that provider, that model
    #   provider only    → that provider, on its own default model
    #   model only       → the user's default provider, on that model (what every
    #                      mapping was before providers became a list)
    def resolve_task_override(user, task_name)
      return nil if task_name.blank?

      mapping = UserTaskModelMapping.find_by(user_id: user.id, task_name: task_name)
      return nil unless mapping

      if mapping.llm_provider_id
        resolve_mapped_provider(user, mapping)
      else
        model_only_override(user, mapping)
      end
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

    # The named provider still has to be one this user may use *now*: a gate can
    # be revoked, a provider deleted, and a model's access rule narrowed, long
    # after the override was set.
    def resolve_mapped_provider(user, mapping)
      provider = mapping.llm_provider
      return nil unless provider && usable_by?(user, provider)
      return resolution_for(provider, mapping.model) if provider.scope == 'user'

      model = institution_model_for(user, provider, mapping.model)
      model.present? ? resolution_for(provider, model) : nil
    end

    # The model an institution provider runs for this user: the one asked for
    # when its rules admit them, otherwise the provider's default, otherwise the
    # first model they may use. Blank when the rules leave them none — the
    # caller falls through rather than spending a request on a refusal.
    def institution_model_for(user, provider, asked = nil)
      return asked if asked.present? && provider.model_allowed?(user, asked)
      return provider.default_model if provider.model_allowed?(user, provider.default_model)

      # Only a provider whose rules actually deny the default gets this far, so
      # the (cached) catalogue lookup stays off the common path.
      institution_models_for(user, provider).first
    end

    def model_only_override(user, mapping)
      base = resolve_user_default(user) || resolve_institution(user)
      return nil unless base

      asked = mapping.model
      asked = institution_model_for(user, base.provider, asked) if base.provider&.scope == 'global'
      LlmResolution.new(
        provider: base.provider,
        model:    asked.presence || base.model,
        api_key:  base.api_key,
        base_url: base.base_url,
        protocol: base.protocol,
      )
    end

    # Personal providers are private to their owner; the institution one is
    # shared, behind its own gate.
    def usable_by?(user, provider)
      if provider.scope == 'user'
        provider.user_id == user.id && user_api_key_allowed?(user)
      else
        provider.enabled && institution_provider_allowed?(user) && provider.grants_access_to?(user)
      end
    end

    def resolution_for(provider, model = nil)
      LlmResolution.new(
        provider: provider,
        model:    model.presence || provider.default_model,
        api_key:  provider.api_key,
        base_url: provider.base_url,
        protocol: provider.api_protocol,
      )
    end

    # ── Level 2: The user's default provider ──────────────────────────────────

    def resolve_user_default(user)
      # Respect the custom-key gate: a user who may not configure a personal
      # provider always falls through to the institution provider, even if a
      # stale 'custom' preference remains from before the permission was revoked.
      return nil unless user_api_key_allowed?(user)

      # Reference UserLlmSetting directly (Zeitwerk autoload) rather than gating on
      # `defined?(UserLlmSetting)` — see resolve_task_override. A missing model
      # is handled by the `rescue StandardError` below (NameError degrades to nil).
      setting = UserLlmSetting.find_by(user_id: user.id, enabled: true)
      return nil if setting.nil? || setting.use_global?

      provider = default_personal_provider(user, setting)
      return nil unless provider

      resolution_for(provider)
    rescue StandardError
      nil
    end

    # The preference points at one provider, but that FK is nullified when the
    # provider is deleted. Rather than dropping the user to the institution
    # provider without a word, fall back to their oldest remaining one.
    def default_personal_provider(user, setting)
      setting.default_llm_provider || LlmProvider.for_user(user).where(enabled: true).first
    end

    # ── Level 3: Admin-configured institution provider ────────────────────────

    def resolve_institution(user)
      provider = institution_provider_for(user)
      return nil unless provider

      model = institution_model_for(user, provider)
      model.present? ? resolution_for(provider, model) : nil
    end
  end
end
