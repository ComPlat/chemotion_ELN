# frozen_string_literal: true

require 'digest'

class ApiToken < ApplicationRecord
  belongs_to :user

  attr_reader :plain_token

  before_create :generate_token!

  scope :active, lambda {
    where(revoked_at: nil)
      .where('expires_at IS NULL OR expires_at > ?', Time.current)
  }

  scope :not_expired, lambda {
    where('expires_at IS NULL OR expires_at > ?', Time.current)
      .order(revoked_at: :desc, expires_at: :desc)
  }

  # Resolves the active token matching a plaintext secret.
  #
  # The plaintext is never stored; only its SHA-256 digest is, in a unique
  # indexed column. Lookup is therefore a single indexed query rather than a
  # hash comparison against every row. A +chemtoken_+ carries 256 bits of
  # entropy, so a fast digest is a sufficient at-rest representation.
  #
  # @param raw_token [String, nil] plaintext token from the Authorization header
  # @return [ApiToken] the matching active token
  # @return [nil] when blank, unknown, revoked, or expired
  def self.authenticate(raw_token)
    return nil if raw_token.blank?

    active.find_by(token_digest: digest_for(raw_token))
  end

  # @param raw_token [String] plaintext token
  # @return [String] hex SHA-256 digest used as the lookup key
  def self.digest_for(raw_token)
    Digest::SHA256.hexdigest(raw_token)
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  private

  def generate_token!
    @plain_token = "chemtoken_#{SecureRandom.hex(32)}"
    self.token_digest = self.class.digest_for(@plain_token)
  end
end
