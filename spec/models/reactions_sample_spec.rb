# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions_samples
#
#  id                          :integer          not null, primary key
#  coefficient                 :float            default(1.0)
#  conversion_rate             :float
#  deleted_at                  :datetime
#  equivalent                  :float
#  gas_phase_data              :jsonb
#  gas_type                    :integer          default("off")
#  position                    :integer
#  reference                   :boolean
#  show_label                  :boolean          default(FALSE), not null
#  type                        :string
#  waste                       :boolean          default(FALSE)
#  weight_percentage           :float
#  weight_percentage_reference :boolean          default(FALSE)
#  created_at                  :datetime
#  updated_at                  :datetime
#  reaction_id                 :integer
#  sample_id                   :integer
#
# Indexes
#
#  index_reactions_samples_on_reaction_id     (reaction_id)
#  index_reactions_samples_on_sample_id       (sample_id)
#  index_reactions_samples_on_sample_id_type  (sample_id,type)
#

require 'rails_helper'

RSpec.describe ReactionsSample do
  let(:collection) { create(:collection) }
  let(:reaction) { create(:reaction, collections: [collection]) }
  let(:sample) { create(:sample) }

  describe 'associations' do
    it { is_expected.to belong_to(:reaction).optional }
    it { is_expected.to belong_to(:sample).optional }
  end

  describe 'gas_type enum' do
    it { is_expected.to define_enum_for(:gas_type).with_values(off: 0, feedstock: 1, catalyst: 2, gas: 3) }

    it 'defaults to off' do
      expect(described_class.new.gas_type).to eq 'off'
    end
  end

  describe '.get_samples' do
    let(:other_reaction) { create(:reaction) }

    before do
      create(:reactions_starting_material_sample, reaction: reaction, sample: sample)
      create(:reactions_product_sample, reaction: reaction, sample: sample)
      create(:reactions_reactant_sample, reaction: other_reaction)
    end

    it 'returns the unique sample ids of the given reactions' do
      expect(described_class.get_samples([reaction.id])).to eq [sample.id]
    end

    it 'returns an empty list when no reaction matches' do
      expect(described_class.get_samples([-1])).to eq []
    end
  end

  describe '.get_reactions' do
    let(:other_reaction) { create(:reaction) }

    before do
      create(:reactions_starting_material_sample, reaction: reaction, sample: sample)
      create(:reactions_solvent_sample, reaction: other_reaction, sample: sample)
      create(:reactions_product_sample, reaction: reaction, sample: sample)
      create(:reactions_reactant_sample)
    end

    it 'returns the unique reaction ids of the given samples' do
      expect(described_class.get_reactions([sample.id])).to contain_exactly(reaction.id, other_reaction.id)
    end

    it 'returns an empty list when no sample matches' do
      expect(described_class.get_reactions([-1])).to eq []
    end
  end

  describe 'after_create :assign_sample_to_collections' do
    it 'adds the sample to every collection of the reaction' do
      create(:reactions_reactant_sample, reaction: reaction, sample: sample)

      expect(CollectionsSample.where(sample: sample, collection: collection)).to exist
    end

    it 'does not duplicate an existing collection membership' do
      CollectionsSample.create!(sample: sample, collection: collection)
      create(:reactions_reactant_sample, reaction: reaction, sample: sample)

      expect(CollectionsSample.where(sample: sample, collection: collection).count).to eq 1
    end
  end

  describe '#destroy' do
    let!(:reactions_sample) { create(:reactions_solvent_sample, reaction: reaction, sample: sample) }

    it 'soft-deletes the record' do
      reactions_sample.destroy

      expect(described_class.find_by(id: reactions_sample.id)).to be_nil
      expect(described_class.with_deleted.find(reactions_sample.id).deleted_at).to be_present
    end
  end

  describe 'STI subclasses' do
    it 'instantiates the subclass matching the stored type' do
      product = create(:reactions_product_sample, reaction: reaction, sample: sample)

      expect(described_class.find(product.id)).to be_a ReactionsProductSample
    end

    it 'mixes Reactable into every subclass' do
      classes = [ReactionsStartingMaterialSample, ReactionsReactantSample, ReactionsSolventSample,
                 ReactionsPurificationSolventSample, ReactionsProductSample]

      expect(classes).to all(include(Reactable))
    end

    it 'mixes Tagging only into starting material, reactant and product samples' do
      tagged = [ReactionsStartingMaterialSample, ReactionsReactantSample, ReactionsProductSample]
      untagged = [ReactionsSolventSample, ReactionsPurificationSolventSample]

      expect(tagged).to all(include(Tagging))
      expect(untagged.map { |klass| klass.include?(Tagging) }).to all(be(false))
    end

    it 'tags the sample with the reaction id when a product sample is created' do
      create(:reactions_product_sample, reaction: reaction, sample: sample)

      expect(sample.reload.tag.taggable_data['reaction_id']).to eq reaction.id
    end
  end

  describe 'ReactionsProductSample#formatted_yield' do
    subject(:product) { ReactionsProductSample.new(equivalent: equivalent) }

    context 'without an equivalent value' do
      let(:equivalent) { nil }

      it { expect(product.formatted_yield).to eq '0 %' }
    end

    context 'when the equivalent is NaN' do
      let(:equivalent) { Float::NAN }

      it { expect(product.formatted_yield).to eq '0 %' }
    end

    context 'with an equivalent value' do
      let(:equivalent) { 0.5 }

      it { expect(product.formatted_yield).to eq '50 %' }
    end

    context 'with an equivalent value that needs rounding' do
      let(:equivalent) { 0.8766 }

      it { expect(product.formatted_yield).to eq '88 %' }
    end

    context 'with an equivalent above 1' do
      let(:equivalent) { 5.0 }

      it { expect(product.formatted_yield).to eq '500 %' }
    end
  end
end
