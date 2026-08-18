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
#  index_llm_providers_on_scope              (scope)
#  index_llm_providers_on_user_id            (user_id)
#  index_llm_providers_on_user_id_and_scope  (user_id,scope)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
class LlmProvider < ApplicationRecord
  include EncryptsApiKey

  # Wire protocol for the endpoint. See LlmClient::PROTOCOLS.
  API_PROTOCOLS = %w[openai anthropic gemini].freeze

  # Who owns this endpoint — the two are the same kind of thing (a URL, a
  # protocol, a model, a key) and differ only in who may use it:
  #   'global' — the institution provider, configured by an admin, shared by
  #              every user the aiGlobalProvider gate allows. user_id is nil.
  #   'user'   — one of a user's own providers. Belongs to user_id and is
  #              reachable by nobody else.
  SCOPES = %w[global user].freeze

  belongs_to :user, optional: true

  validates :name, presence: true
  validates :api_protocol, inclusion: { in: API_PROTOCOLS }
  # Every protocol needs a model: two of them put it in the request body and
  # gemini puts it in the URL. Without one the provider answers with something
  # unrelated to the actual mistake, so a provider may not be saved without it.
  validates :default_model, presence: true
  # The Anthropic and Gemini APIs default their endpoint; a Chat Completions
  # endpoint could be anyone's, so it has to be given.
  validates :base_url, presence: true, if: -> { api_protocol == 'openai' }

  validates :scope, inclusion: { in: SCOPES }
  validates :user_id, presence: true, if: -> { scope == 'user' }
  validates :user_id, absence: true,  if: -> { scope == 'global' }

  # Enabled institution provider(s). The resolver uses `.first` — there is only
  # ever one meaningful global provider, but the scope stays plural/ordered for
  # determinism. The `scope:` filter is not optional: without it this would also
  # return users' personal providers and hand one user's API key to everyone.
  scope :global_providers, -> { where(scope: 'global', enabled: true).order(:id) }

  # A single user's own providers. Every personal-provider lookup goes through
  # here, so a user can never reach another user's row by guessing an id.
  scope :for_user, ->(user) { where(scope: 'user', user_id: user.is_a?(Integer) ? user : user&.id).order(:id) }

  def personal?
    scope == 'user'
  end
end
