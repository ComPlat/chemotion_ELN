# app/models/api_token.rb

class ApiToken < ApplicationRecord
  belongs_to :user

  attr_reader :plain_token

  before_create :generate_token!

  scope :active, -> {
    where(revoked_at: nil)
      .where("expires_at IS NULL OR expires_at > ?", Time.current)
  }

  scope :not_expired, -> {
    where("expires_at IS NULL OR expires_at > ?", Time.current)
      .order(revoked_at: :desc, expires_at: :desc)
  }

  def self.authenticate(raw_token)
    active.find_each.detect do |token|
      BCrypt::Password.new(token.token).is_password?(raw_token)
    end
  end

  def revoke!
    update!(revoked_at: Time.current)
  end

  private

  def generate_token!
    @plain_token = "chemtoken_#{SecureRandom.hex(32)}"

    self.token = BCrypt::Password.create(@plain_token)
  end
end