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
    return unless @api_key.present?

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
