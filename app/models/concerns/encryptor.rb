# frozen_string_literal: true

module Encryptor
  extend ActiveSupport::Concern

  def encrypt_value(value)
    encryptor.encrypt_and_sign(value)
  end

  def decrypt_value(encrypted_value)
    encryptor.decrypt_and_verify(encrypted_value)
  rescue StandardError
    encrypted_value
  end

  private

  def encryptor
    key = Rails.application.secrets.secret_key_base[0..31]
    ActiveSupport::MessageEncryptor.new(key, cipher: 'aes-256-gcm')
  end
end
