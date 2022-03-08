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
  def issued_token
    token = access_token
    if DateTime.now > expires_at
      token = refresh_token
      begin
        access_set = Chemotion::ScifinderNService.provider_access(token)
        update!(access_token: access_set[:access_token], refresh_token: access_set[:refresh_token], expires_at: access_set[:expires_at])
        token = access_token
      rescue StandardError => e
        Rails.logger.error("Error while issuing token: #{e}")
      end
    end
    token
  end
end
