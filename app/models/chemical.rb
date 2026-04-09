# frozen_string_literal: true

# == Schema Information
#
# Table name: chemicals
#
#  id                                     :bigint           not null, primary key
#  cas                                    :text
#  chemical_data                          :jsonb
#  deleted_at                             :datetime
#  updated_at                             :datetime
#  sample_id                              :integer
#  sequence_based_macromolecule_sample_id :bigint
#
# Indexes
#
#  idx_chemicals_sbmm_sample_id  (sequence_based_macromolecule_sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (sequence_based_macromolecule_sample_id => sequence_based_macromolecule_samples.id)
#

class Chemical < ApplicationRecord
  has_logidze
  acts_as_paranoid
  belongs_to :sample, optional: true
  belongs_to :sequence_based_macromolecule_sample, optional: true

  validate :only_one_parent
  validate :at_least_one_parent

  private

  def only_one_parent
    return unless sample_id.present? && sequence_based_macromolecule_sample_id.present?

    errors.add(
      :base,
      'Chemical can belong to either a sample or a sequence_based_macromolecule_sample, not both',
    )
  end

  def at_least_one_parent
    return if sample_id.present? || sequence_based_macromolecule_sample_id.present?

    errors.add(
      :base,
      'Chemical must belong to either a sample or a sequence_based_macromolecule_sample',
    )
  end
end
