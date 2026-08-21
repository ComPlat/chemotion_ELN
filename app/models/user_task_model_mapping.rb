# frozen_string_literal: true

# == Schema Information
#
# Table name: user_task_model_mappings
#
#  id              :bigint           not null, primary key
#  model           :string
#  task_name       :string           not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  llm_provider_id :bigint
#  user_id         :bigint           not null
#
# Indexes
#
#  index_user_task_model_mappings_on_llm_provider_id        (llm_provider_id)
#  index_user_task_model_mappings_on_user_id                (user_id)
#  index_user_task_model_mappings_on_user_id_and_task_name  (user_id,task_name) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (llm_provider_id => llm_providers.id) ON DELETE => cascade
#  fk_rails_...  (user_id => users.id) ON DELETE => cascade
#
# One task's routing override: send this task to this provider, on this model.
#
# Both parts are optional on their own:
#   provider + model → run the task there, on that model
#   provider only    → run it there, on that provider's own default model
#   model only       → run it on the user's default provider, on that model
#                      (what every mapping was before multi-provider support)
# A row with neither is meaningless and is rejected.
class UserTaskModelMapping < ApplicationRecord
  belongs_to :user
  belongs_to :llm_provider, optional: true

  validates :task_name, presence: true
  validates :task_name, uniqueness: { scope: :user_id }
  validate  :names_a_provider_or_a_model
  validate  :provider_is_reachable_by_user

  private

  def names_a_provider_or_a_model
    return if model.present? || llm_provider_id.present?

    errors.add(:base, 'A task override must name a provider, a model, or both')
  end

  # Personal providers are private to their owner; the institution provider is
  # shared. Anything else would let one user route their tasks — and their data —
  # through another user's endpoint and key.
  def provider_is_reachable_by_user
    return if llm_provider.nil?
    return if llm_provider.scope == 'global'
    return if llm_provider.user_id == user_id

    errors.add(:llm_provider, 'must be the institution provider or one of your own')
  end
end
