# frozen_string_literal: true

# == Schema Information
#
# Table name: llm_providers
#
#  id            :bigint           not null, primary key
#  api_key_enc   :text
#  api_protocol  :string           default("openai"), not null
#  base_url      :string
#  default_model :string
#  enabled       :boolean          default(TRUE), not null
#  name          :string           not null
#  provider_type :string
#  scope         :string           default("global"), not null
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  user_id       :bigint
#
# Indexes
#
#  index_llm_providers_on_scope    (scope)
#  index_llm_providers_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
class LlmProvider < ApplicationRecord
  include EncryptsApiKey

  # Wire protocol for the endpoint. See LlmClient::PROTOCOLS.
  API_PROTOCOLS = %w[openai anthropic gemini].freeze

  validates :name, presence: true
  validates :api_protocol, inclusion: { in: API_PROTOCOLS }

  # Enabled provider(s). The resolver uses `.first` — there is only ever one
  # meaningful global provider, but the scope stays plural/ordered for determinism.
  scope :global_providers, -> { where(enabled: true).order(:id) }
end
