# frozen_string_literal: true

# One access rule about one institution provider, or about one of its models.
#
#   model nil → the provider as a whole
#   model 'x' → just that model
#
# The rule reads exactly like a Matrice gate, which is what admins already use
# for every other feature here:
#   enabled true  → everyone, minus exclude_ids
#   enabled false → only include_ids
#
# Rules only ever narrow the aiGlobalProvider gate. A target with no rule is
# ungated — except on a provider marked restrict_models, where a model needs a
# rule to be offered at all.
# == Schema Information
#
# Table name: llm_provider_grants
#
#  id              :bigint           not null, primary key
#  enabled         :boolean          default(TRUE), not null
#  exclude_ids     :integer          default([]), is an Array
#  include_ids     :integer          default([]), is an Array
#  model           :string
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  llm_provider_id :bigint           not null
#
# Indexes
#
#  index_llm_provider_grants_on_model     (llm_provider_id,model) UNIQUE WHERE (model IS NOT NULL)
#  index_llm_provider_grants_on_provider  (llm_provider_id) UNIQUE WHERE (model IS NULL)
#
# Foreign Keys
#
#  fk_rails_...  (llm_provider_id => llm_providers.id) ON DELETE => cascade
#
class LlmProviderGrant < ApplicationRecord
  belongs_to :llm_provider

  validates :model, uniqueness: { scope: :llm_provider_id }, allow_nil: true
  validate  :one_provider_rule_per_provider
  validate  :provider_is_an_institution_one

  # The rule about the provider itself, as opposed to one of its models.
  scope :provider_rules, -> { where(model: nil) }
  scope :model_rules,    -> { where.not(model: nil) }

  def provider_rule?
    model.nil?
  end

  # ids are User ids; a group grants its members through users_groups, the same
  # way Matrice does.
  def allows?(user)
    ids = user_and_group_ids(user)

    if enabled
      (exclude_ids || []).intersection(ids).empty?
    else
      (include_ids || []).intersection(ids).any?
    end
  end

  private

  def user_and_group_ids(user)
    [user.id, *user.group_ids]
  rescue StandardError
    # A user model without group memberships still has to resolve to something.
    [user.id]
  end

  def one_provider_rule_per_provider
    return unless provider_rule?

    clash = self.class.provider_rules.where(llm_provider_id: llm_provider_id).where.not(id: id).exists?
    errors.add(:base, 'This provider already has a rule') if clash
  end

  # A personal provider is private to its owner; there is nobody else to grant it
  # to, and a rule here would read as though there were.
  def provider_is_an_institution_one
    return if llm_provider.nil? || llm_provider.scope == 'global'

    errors.add(:llm_provider, 'must be an institution provider')
  end
end
