# frozen_string_literal: true

# == Schema Information
#
# Table name: user_llm_settings
#
#  id            :bigint           not null, primary key
#  api_key_enc   :text
#  api_protocol  :string           default("openai"), not null
#  base_url      :string
#  default_model :string
#  enabled       :boolean          default(TRUE), not null
#  provider_type :string           default("global"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  user_id       :bigint           not null
#
# Indexes
#
#  index_user_llm_settings_on_user_id  (user_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
class UserLlmSetting < ApplicationRecord
  include EncryptsApiKey

  PROVIDER_TYPES = %w[global custom].freeze
  # Wire protocol for a 'custom' endpoint. See LlmClient::PROTOCOLS.
  API_PROTOCOLS = %w[openai anthropic gemini].freeze

  belongs_to :user

  validates :provider_type, inclusion: { in: PROVIDER_TYPES }
  validates :api_protocol, inclusion: { in: API_PROTOCOLS }
  validates :base_url, presence: true, if: -> { provider_type == 'custom' && api_protocol == 'openai' }

  # Whether AI features are enabled for this user.
  # SF-03 also adds an admin-level global toggle; this is the per-user override.
  scope :ai_enabled, -> { where(enabled: true) }

  def use_global?
    provider_type == 'global'
  end
end
