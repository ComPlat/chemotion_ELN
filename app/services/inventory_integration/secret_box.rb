# frozen_string_literal: true

module InventoryIntegration
  # Seals connection credentials with AES-256-GCM. Unlike the Encryptor concern it never falls back
  # to the stored text: anything it cannot decrypt raises CredentialsUnreadable.
  class SecretBox
    VERSION = 'v1'
    KEY_VERSION = 1
    PREFIX = "#{VERSION}:"
    KEY_SALT = 'inventory_integration/credentials/v1'

    def initialize(key = self.class.key)
      @key = key
    end

    # @param secrets [Hash] secret settings, e.g. { 'api_key' => '...' }
    # @return [String] "v1:" followed by the sealed JSON
    def seal(secrets)
      PREFIX + encryptor.encrypt_and_sign(secrets.to_h.stringify_keys.to_json)
    end

    # @raise [Errors::CredentialsUnreadable] for a wrong key, a foreign format or tampered text
    def open(ciphertext)
      unless ciphertext.is_a?(String) && ciphertext.start_with?(PREFIX)
        raise Errors::CredentialsUnreadable, 'stored credentials have an unknown format'
      end

      JSON.parse(encryptor.decrypt_and_verify(ciphertext.delete_prefix(PREFIX)))
    rescue ActiveSupport::MessageEncryptor::InvalidMessage, ActiveSupport::MessageVerifier::InvalidSignature,
           JSON::ParserError
      raise Errors::CredentialsUnreadable, 'stored credentials cannot be decrypted with the current key'
    end

    # Keyed digest for "did the credentials change?"; it cannot be brute-forced without the key.
    def fingerprint(secrets)
      OpenSSL::HMAC.hexdigest('SHA256', @key, secrets.to_h.stringify_keys.sort.to_json)[0, 16]
    end

    # The key from the ENV variable IT names in encryption_key_env (64 hex characters or base64 of
    # 32 bytes), otherwise one derived from secret_key_base.
    def self.key(config = IntegrationConfig.current)
      env_name = config.encryption_key_env
      return Rails.application.key_generator.generate_key(KEY_SALT, 32) if env_name.blank?

      decode_key(ENV.fetch(env_name, nil)) ||
        raise(Errors::CredentialsUnreadable, "#{env_name} must hold a 32-byte key (64 hex characters or base64)")
    end

    def self.decode_key(value)
      return if value.blank?
      return [value].pack('H*') if value.match?(/\A\h{64}\z/)

      decoded = Base64.strict_decode64(value)
      decoded if decoded.bytesize == 32
    rescue ArgumentError
      nil
    end

    private

    def encryptor
      @encryptor ||= ActiveSupport::MessageEncryptor.new(@key, cipher: 'aes-256-gcm')
    end
  end
end
