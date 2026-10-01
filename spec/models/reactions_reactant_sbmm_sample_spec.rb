# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions_reactant_sbmm_samples
#
#  id                                     :bigint           not null, primary key
#  deleted_at                             :datetime
#  equivalent                             :float
#  position                               :integer
#  reference                              :boolean          default(FALSE), not null
#  show_label                             :boolean          default(FALSE), not null
#  weight_percentage                      :float
#  created_at                             :datetime
#  updated_at                             :datetime
#  reaction_id                            :integer          not null
#  sequence_based_macromolecule_sample_id :bigint           not null
#
# Indexes
#
#  idx_rxn_reactant_sbmm_on_deleted  (deleted_at)
#  idx_rxn_reactant_sbmm_on_rxn_id   (reaction_id)
#  idx_rxn_reactant_sbmm_on_sbmm_id  (sequence_based_macromolecule_sample_id)
#
# Foreign Keys
#
#  fk_rails_...  (reaction_id => reactions.id)
#  fk_rails_...  (sequence_based_macromolecule_sample_id => sequence_based_macromolecule_samples.id)
#
require 'rails_helper'

RSpec.describe ReactionsReactantSbmmSample do
  let(:user) { create(:person) }
  let(:sbmm) { create(:uniprot_sbmm) }
  let(:reaction) { create(:reaction) }
  let(:other_reaction) { create(:reaction) }
  let(:sbmm_sample) { create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user) }
  let(:other_sbmm_sample) do
    create(:sequence_based_macromolecule_sample, sequence_based_macromolecule: sbmm, user: user)
  end

  it { is_expected.to belong_to(:reaction).optional }
  it { is_expected.to belong_to(:sequence_based_macromolecule_sample).optional }

  describe '.get_sbmm_samples' do
    before do
      described_class.create!(reaction: reaction, sequence_based_macromolecule_sample: sbmm_sample)
      described_class.create!(reaction: other_reaction, sequence_based_macromolecule_sample: sbmm_sample)
      described_class.create!(reaction: other_reaction, sequence_based_macromolecule_sample: other_sbmm_sample)
    end

    it 'returns the distinct sbmm sample ids of the given reactions' do
      expect(described_class.get_sbmm_samples([reaction.id, other_reaction.id]))
        .to contain_exactly(sbmm_sample.id, other_sbmm_sample.id)
    end

    it 'accepts a single reaction id' do
      expect(described_class.get_sbmm_samples(reaction.id)).to eq([sbmm_sample.id])
    end

    it 'ignores soft-deleted links' do
      described_class.find_by(reaction: reaction).destroy

      expect(described_class.get_sbmm_samples(reaction.id)).to be_empty
    end
  end

  describe '.get_reactions' do
    before do
      described_class.create!(reaction: reaction, sequence_based_macromolecule_sample: sbmm_sample)
      described_class.create!(reaction: other_reaction, sequence_based_macromolecule_sample: sbmm_sample)
      described_class.create!(reaction: other_reaction, sequence_based_macromolecule_sample: other_sbmm_sample)
    end

    it 'returns the distinct reaction ids of the given sbmm samples' do
      expect(described_class.get_reactions([sbmm_sample.id, other_sbmm_sample.id]))
        .to contain_exactly(reaction.id, other_reaction.id)
    end

    it 'returns an empty list for unknown sbmm samples' do
      expect(described_class.get_reactions([0])).to eq([])
    end
  end

  describe 'tagging callbacks' do
    let(:tag_data) { sbmm_sample.reload.tag.taggable_data }

    context 'when the link is created' do
      before { described_class.create!(reaction: reaction, sequence_based_macromolecule_sample: sbmm_sample) }

      it 'stores the reaction id in the sbmm sample tag' do
        expect(tag_data['reaction_id']).to eq(reaction.id)
      end

      it 'adds the reaction to the sbmm sample resources tag' do
        expect(tag_data['resources']).to contain_exactly(
          'resource_context_type' => 'Reaction',
          'resource_context_id' => reaction.id,
          'resource_context_label' => reaction.short_label,
        )
      end
    end

    context 'when the link is soft-deleted' do
      it 'removes the reaction from the sbmm sample resources tag' do
        link = described_class.create!(reaction: reaction, sequence_based_macromolecule_sample: sbmm_sample)
        link.destroy

        expect(tag_data).not_to have_key('resources')
      end
    end
  end

  describe 'soft delete' do
    it 'keeps the record retrievable with_deleted' do
      link = described_class.create!(reaction: reaction, sequence_based_macromolecule_sample: sbmm_sample)
      link.destroy

      expect(described_class.with_deleted.find(link.id).deleted_at).to be_present
    end
  end
end
