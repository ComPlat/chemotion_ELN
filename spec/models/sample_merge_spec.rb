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
require 'rails_helper'

describe SampleMerge do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:reaction) { create(:reaction, collections: [collection]) }
  let(:sample_a) { create(:sample, collections: [collection]) }
  let(:sample_b) { create(:sample, collections: [collection]) }

  def build_merge(**overrides)
    described_class.new(
      { source_sample: sample_a, target_sample: sample_b, reaction: reaction, source_amount_mol: 1.0 }
        .merge(overrides),
    )
  end

  it 'is valid with a distinct source and target' do
    expect(build_merge).to be_valid
  end

  it 'rejects a source equal to the target' do
    expect(build_merge(target_sample: sample_a)).not_to be_valid
  end

  it 'rejects a negative source amount' do
    expect(build_merge(source_amount_mol: -1.0)).not_to be_valid
  end

  it 'enforces uniqueness of the source sample' do
    build_merge.save!
    duplicate = build_merge(target_sample: create(:sample, collections: [collection]))
    expect(duplicate).not_to be_valid
  end
end
