# frozen_string_literal: true

# Provides transparent encryption/decryption for a single :api_key attribute.
# The ciphertext is persisted in the :api_key_enc column.
#
# Encryption uses ActiveSupport::MessageEncryptor with a key derived from the
# LLM_API_KEY_ENCRYPTION_KEY env variable (falls back to SECRET_KEY_BASE in
# non-production environments).
#
# Usage:
#   class LlmProvider < ApplicationRecord
#     include EncryptsApiKey
#   end
#
#   provider = LlmProvider.new(api_key: 'sk-abc123')
#   provider.save!
#   provider.api_key             # => 'sk-abc123'   (decrypted on read)
#   provider.api_key_enc         # => '<ciphertext>' (stored in DB)
#
module EncryptsApiKey
  extend ActiveSupport::Concern

  included do
    # Virtual writer — stores plaintext in memory until save
    attr_writer :api_key

    # Transparently decrypt on read; returns nil if no key is stored
    def api_key
      return @api_key if @api_key.present?
      return nil if api_key_enc.blank?

      self.class.llm_encryptor.decrypt_and_verify(api_key_enc)
    rescue ActiveSupport::MessageEncryptor::InvalidMessage, ActiveSupport::MessageVerifier::InvalidSignature
      nil
    end

    # Drop the in-memory plaintext when the record is reloaded, so #api_key goes
    # back to reflecting what is actually stored. Without this, a record that was
    # built or updated with a plaintext key keeps returning it after a reload —
    # including after the key was cleared in the database.
    def reload(*)
      @api_key = nil
      super
    end

    # Mask for display in logs / UI responses (e.g. "sk-••••••••1234")
    def api_key_masked
      plain = api_key
      return nil if plain.blank?

      visible = plain.last(4)
      "#{plain[0, 3]}#{'•' * 8}#{visible}"
    end

    before_save :encrypt_api_key_to_enc
  end

  private

  def encrypt_api_key_to_enc
    # An explicit `api_key_enc = nil` in this save is a deletion, and it wins over
    # any plaintext still sitting in the instance from an earlier assignment.
    # Without this the callback re-encrypts that stale plaintext and the deletion
    # silently does nothing — the row keeps its key while the caller is told the
    # save succeeded.
    return if api_key_enc.nil? && api_key_enc_changed?
    return if @api_key.blank?

    self.api_key_enc = self.class.llm_encryptor.encrypt_and_sign(@api_key)
  end

  class_methods do
    # Deterministic encryptor derived from an application-level secret.
    # The key is cached at class level after first call.
    def llm_encryptor
      @llm_encryptor ||= begin
        raw_key = ENV.fetch('LLM_API_KEY_ENCRYPTION_KEY') do
          Rails.application.secrets.secret_key_base
        end
        key = ActiveSupport::KeyGenerator
              .new(raw_key, iterations: 65_536)
              .generate_key('llm_api_key_v1', 32)
        ActiveSupport::MessageEncryptor.new(key)
      end
    end

    # Expose for test overrides
    def reset_llm_encryptor!
      @llm_encryptor = nil
    end
  end
end
