# frozen_string_literal: true

# == Schema Information
#
# Table name: affiliation_suggestions
#
#  id                         :bigint           not null, primary key
#  country                    :string
#  department                 :string
#  group                      :string
#  organization               :string
#  status                     :integer          default("pending"), not null
#  created_at                 :datetime         not null
#  updated_at                 :datetime         not null
#  affiliation_id             :integer
#  ror_id                     :string
#  target_user_affiliation_id :integer
#  user_id                    :integer          not null
#
# Indexes
#
#  index_affiliation_suggestions_on_status   (status)
#  index_affiliation_suggestions_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class AffiliationSuggestion < ApplicationRecord
  enum status: { pending: 0, approved: 1, rejected: 2 }

  belongs_to :user
  belongs_to :affiliation, optional: true

  validates :organization, allow_blank: true, length: { maximum: 255 }
  validate do
    next if [organization, department, group].any?(&:present?)

    errors.add(:base, 'must include an organization, department, or group')
  end
end
