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
  def issued_token
    return access_token if DateTime.now <= expires_at
    return if refresh_token.blank?

    access_set = Chemotion::ScifinderNService.provider_access(refresh_token)
    # Keep the stored refresh token if the provider does not issue a new one.
    update!(
      access_token: access_set[:access_token],
      refresh_token: access_set[:refresh_token].presence || refresh_token,
      expires_at: access_set[:expires_at],
    )
    access_token
  rescue StandardError => e
    Rails.logger.error("Error while issuing token: #{e}")
    nil
  end
end
