# frozen_string_literal: true

# == Schema Information
#
# Table name: scifinder_n_credentials
#
#  id            :bigint           not null, primary key
#  access_token  :string           not null
#  refresh_token :string
#  expires_at    :datetime         not null
#  created_by    :integer          not null
#  updated_at    :datetime         not null
#
# Indexes
#
#  uni_scifinder_n_credentials  (created_by) UNIQUE
#

class ScifinderNCredential < ApplicationRecord
  # Returns a usable access token, refreshing it first if it has expired.
  # Returns nil if there is no refresh token or the refresh fails.
  # The refresh runs under a row lock, so concurrent requests do not send the same refresh token twice.
  def issued_token
    return access_token if token_valid?

    # with_lock reloads the row, so a refresh made by another request in the meantime is picked up.
    with_lock { token_valid? ? access_token : refresh_access_token }
  rescue StandardError => e
    restore_attributes
    Rails.logger.error("Error while issuing token: #{e.class}")
    nil
  end

  private

  def token_valid?
    DateTime.now <= expires_at
  end

  def refresh_access_token
    return if refresh_token.blank?

    access_set = Chemotion::ScifinderNService.provider_access(refresh_token)
    if access_set[:access_token].blank?
      Rails.logger.error('Error while issuing token: no access token in the refresh response')
      return
    end

    # Keep the stored refresh token if the provider does not issue a new one.
    update!(
      access_token: access_set[:access_token],
      refresh_token: access_set[:refresh_token].presence || refresh_token,
      expires_at: access_set[:expires_at],
    )
    access_token
  end
end
