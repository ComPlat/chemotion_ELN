# frozen_string_literal: true

# == Schema Information
#
# Table name: sample_merges
#
#  id                                 :bigint           not null, primary key
#  source_amount_mol                  :float            not null
#  source_reaction_sample_attributes  :jsonb
#  target_molecule_id_before          :integer
#  target_real_amount_unit_before     :string
#  target_real_amount_value_before    :float
#  created_at                         :datetime
#  updated_at                         :datetime
#  reaction_id                        :integer          not null
#  source_sample_id                   :integer          not null
#  target_sample_id                   :integer          not null
#
# Indexes
#
#  index_sample_merges_on_source_sample_id     (source_sample_id) UNIQUE
#  index_sample_merges_on_target_and_reaction  (target_sample_id,reaction_id)
#
# Foreign Keys
#
#  fk_sample_merges_reaction  (reaction_id => reactions.id)
#  fk_sample_merges_source    (source_sample_id => samples.id)
#  fk_sample_merges_target    (target_sample_id => samples.id)
#
class SampleMerge < ApplicationRecord
  belongs_to :source_sample, class_name: 'Sample', inverse_of: :outgoing_merge
  belongs_to :target_sample, class_name: 'Sample', inverse_of: :incoming_merges
  belongs_to :reaction, inverse_of: :sample_merges

  validates :source_sample_id, uniqueness: true
  validate  :source_and_target_differ
  validate  :source_amount_mol_non_negative

  private

  def source_and_target_differ
    errors.add(:source_sample_id, 'cannot equal target') if source_sample_id == target_sample_id
  end

  def source_amount_mol_non_negative
    errors.add(:source_amount_mol, 'must be >= 0') if source_amount_mol&.negative?
  end
end
