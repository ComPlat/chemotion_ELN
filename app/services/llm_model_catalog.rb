# frozen_string_literal: true

# Cached access to a provider's model catalogue (its `/v1/models` endpoint).
#
# Every model-list lookup is a live HTTP round trip from the ELN to the LLM
# provider, and the AI settings UI asks for one whenever the user lands on a
# different provider. The set of models a provider offers changes on the order
# of weeks, so the answer is cached per provider identity instead.
#
# Cache identity = protocol + base_url + a digest of the API key. The key digest
# is part of it because this cache is shared by every request on the host: two
# users pointing at the same endpoint with different keys can legitimately be
# offered different catalogues, so their entries must not collide. Only the
# digest is ever stored — never the key itself.
#
# Empty results are deliberately NOT cached. `LlmClient#list_models` returns []
# for every failure (unreachable endpoint, wrong key, provider without a models
# endpoint), and caching that would leave the dropdown empty for the whole TTL
# even after the user fixes their config.
#
# The browser keeps its own short-lived copy (see
# app/javascript/src/utilities/llmModelCache.js) so that merely toggling between
# providers in the form costs no request at all; this cache is what protects the
# provider across page reloads, extra tabs and other users.
class LlmModelCatalog
  CACHE_TTL       = 30.minutes
  CACHE_NAMESPACE = 'llm_model_catalog'
  # Cache stores disagree on what `delete_matched` accepts: MemoryStore and
  # FileStore want a Regexp, RedisCacheStore wants a glob String. Try each in turn
  # (see .clear!).
  CACHE_MATCHERS = [%r{\Allm_model_catalog/}, 'llm_model_catalog/*'].freeze

  class << self
    # @param base_url [String, nil] provider endpoint ('' / nil = protocol default)
    # @param api_key  [String, nil] provider key (nil for keyless local endpoints)
    # @param protocol [String]      'openai' | 'anthropic' | 'gemini'
    # @param force    [Boolean]     ignore (and replace) any cached entry
    # @return [Array<String>]       model IDs, [] when the provider offers none
    def fetch(base_url:, api_key:, protocol: 'openai', force: false)
      key = cache_key(base_url: base_url, api_key: api_key, protocol: protocol)
      store.delete(key) if force

      cached = store.read(key)
      return cached if cached.present?

      models = LlmClient.new(
        base_url: base_url,
        api_key:  api_key,
        model:    '', # irrelevant to a models listing
        protocol: protocol.presence || 'openai',
      ).list_models

      store.write(key, models, expires_in: CACHE_TTL) if models.present?
      models
    end

    # Drop the cached catalogue for one provider identity — call after changing a
    # provider's key or endpoint if the new catalogue must be visible at once.
    def invalidate(base_url:, api_key:, protocol: 'openai')
      store.delete(cache_key(base_url: base_url, api_key: api_key, protocol: protocol))
    end

    # Wipe every cached catalogue (used by the test suite).
    #
    # MemCacheStore supports no bulk delete at all; there `invalidate` per provider
    # identity is the only way to evict, and this call is a no-op beyond dropping
    # the memoised store handle.
    def clear!
      CACHE_MATCHERS.each do |matcher|
        store.delete_matched(matcher)
        break
      rescue StandardError
        next # wrong matcher flavour (or no delete_matched at all) — try the next
      end
      nil
    ensure
      @store = nil
    end

    private

    def cache_key(base_url:, api_key:, protocol:)
      [
        CACHE_NAMESPACE,
        protocol.presence || 'openai',
        normalize_url(base_url),
        key_digest(api_key),
      ].join('/')
    end

    # Trailing slashes are insignificant to the provider (LlmClient chomps them),
    # so they must not split the cache either.
    def normalize_url(base_url)
      base_url.to_s.strip.chomp('/').presence || 'default'
    end

    def key_digest(api_key)
      return 'nokey' if api_key.blank?

      Digest::SHA256.hexdigest(api_key.to_s)[0, 16]
    end

    # Rails.cache is a NullStore in development unless `rails dev:cache` is on —
    # i.e. exactly where a developer would try to observe this caching. Fall back
    # to a process-local store there so the behaviour is the same everywhere.
    def store
      @store ||= if Rails.cache.is_a?(ActiveSupport::Cache::NullStore)
                   ActiveSupport::Cache::MemoryStore.new(size: 1.megabyte)
                 else
                   Rails.cache
                 end
    end
  end
end
