# frozen_string_literal: true

# == Schema Information
#
# Table name: user_llm_settings
#
#  id                      :bigint           not null, primary key
#  enabled                 :boolean          default(TRUE), not null
#  provider_type           :string           default("global"), not null
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  default_llm_provider_id :bigint
#  user_id                 :bigint           not null
#
# Indexes
#
#  index_user_llm_settings_on_default_llm_provider_id  (default_llm_provider_id)
#  index_user_llm_settings_on_user_id                  (user_id) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (default_llm_provider_id => llm_providers.id) ON DELETE => nullify
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
# This record is the user's PREFERENCE, not a provider: it answers one question —
# where does a task go when it names no provider of its own?
#
#   provider_type 'global' → the institution provider (LlmProvider scope 'global')
#   provider_type 'custom' → default_llm_provider, one of the user's own
#                            (LlmProvider scope 'user')
#
# Endpoints, models and keys all live on LlmProvider — a user may have several of
# their own, and one record could only ever describe one of them.
class UserLlmSetting < ApplicationRecord
  PROVIDER_TYPES = %w[global custom].freeze

  belongs_to :user
  belongs_to :default_llm_provider, class_name: 'LlmProvider', optional: true

  validates :provider_type, inclusion: { in: PROVIDER_TYPES }
  validate  :default_llm_provider_belongs_to_user

  # Whether AI features are enabled for this user.
  # SF-03 also adds an admin-level global toggle; this is the per-user override.
  scope :ai_enabled, -> { where(enabled: true) }

  def use_global?
    provider_type == 'global'
  end

  private

  # A preference may only point at one of this user's own providers. Without this
  # check, a crafted default_llm_provider_id would make every task run on another
  # user's endpoint — and spend their API key.
  def default_llm_provider_belongs_to_user
    return if default_llm_provider.nil?
    return if default_llm_provider.scope == 'user' && default_llm_provider.user_id == user_id

    errors.add(:default_llm_provider, 'must be one of your own providers')
  end
end
