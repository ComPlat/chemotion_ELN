# frozen_string_literal: true

require 'rails_helper'

describe SampleMergeService do
  subject(:service) { described_class.new(current_user: user) }

  let(:user) { create(:user) }
  let(:collection) { create(:collection, user: user) }
  let(:reaction) { create(:reaction, collections: [collection]) }
  let(:molecule) { create(:molecule) }

  # Creates a product sample, places it in the user's collection, and links it
  # to the reaction as a ReactionsProductSample.
  def build_product(real_value:, real_unit:, molecule:)
    build_material(:reactions_product_sample, real_value: real_value, real_unit: real_unit, molecule: molecule)
  end

  # Same as build_product, but linked to the reaction as a ReactionsReactantSample.
  def build_reactant(real_value:, real_unit:, molecule:)
    build_material(:reactions_reactant_sample, real_value: real_value, real_unit: real_unit, molecule: molecule)
  end

  def build_material(factory, real_value:, real_unit:, molecule:)
    sample = create(
      :sample,
      collections: [collection],
      molecule: molecule,
      purity: 1.0,
      real_amount_value: real_value,
      real_amount_unit: real_unit,
    )
    create(factory, reaction: reaction, sample: sample)
    sample
  end

  describe '#merge!' do
    context 'when both products share the same molecule (mol units)' do
      let(:source) { build_product(real_value: 2.0, real_unit: 'mol', molecule: molecule) }
      let(:target) { build_product(real_value: 3.0, real_unit: 'mol', molecule: molecule) }

      it 'adds the source amount into the target' do
        result = service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)

        expect(result.real_amount_value).to eq(5.0)
        expect(result.real_amount_unit).to eq('mol')
      end

      it 'marks the source as legacy and removes its product row' do
        service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)

        expect(source.reload.is_legacy).to be true
        expect(reaction.reactions_product_samples.exists?(sample_id: source.id)).to be false
      end

      it 'records the merge with the source amount and the target snapshot' do
        expect do
          service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
        end.to change(SampleMerge, :count).by(1)

        merge = SampleMerge.last
        expect(merge.source_amount_mol).to eq(2.0)
        expect(merge.target_real_amount_value_before).to eq(3.0)
      end
    end

    context 'when amounts are in grams' do
      let(:source) { build_product(real_value: molecule.molecular_weight, real_unit: 'g', molecule: molecule) }
      let(:target) { build_product(real_value: molecule.molecular_weight * 2, real_unit: 'g', molecule: molecule) }

      it 'converts grams to mol before adding' do
        result = service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)

        expect(result.real_amount_value).to be_within(1e-6).of(3.0)
        expect(result.real_amount_unit).to eq('mol')
      end
    end

    context 'when the products have different structures' do
      let(:source) { build_product(real_value: 1.0, real_unit: 'mol', molecule: create(:molecule)) }
      let(:target) { build_product(real_value: 1.0, real_unit: 'mol', molecule: create(:molecule)) }

      it 'raises a MergeError' do
        expect do
          service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
        end.to raise_error(SampleMergeService::MergeError, /different structures/)
      end
    end

    context 'when the source has no recorded real amount (n.d)' do
      let(:source) { build_product(real_value: 0.0, real_unit: nil, molecule: molecule) }
      let(:target) { build_product(real_value: 3.0, real_unit: 'mol', molecule: molecule) }

      it 'treats the source as 0 mol and merges without error' do
        result = service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)

        expect(result.real_amount_value).to eq(3.0)
        expect(result.real_amount_unit).to eq('mol')
      end
    end

    context 'when an amount uses an unconvertible unit' do
      let(:source) { build_product(real_value: 5.0, real_unit: 'ml', molecule: molecule) }
      let(:target) { build_product(real_value: 1.0, real_unit: 'mol', molecule: molecule) }

      it 'raises instead of silently losing mass' do
        expect do
          service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
        end.to raise_error(SampleMergeService::MergeError, /cannot convert/)
      end
    end

    context 'when the source is already merged' do
      let(:source) { build_product(real_value: 1.0, real_unit: 'mol', molecule: molecule) }
      let(:target) { build_product(real_value: 1.0, real_unit: 'mol', molecule: molecule) }

      before { source.update!(is_legacy: true) }

      it 'raises a MergeError' do
        expect do
          service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
        end.to raise_error(SampleMergeService::MergeError, /already merged/)
      end
    end

    context 'when the user cannot access the reaction' do
      let(:source) { build_product(real_value: 1.0, real_unit: 'mol', molecule: molecule) }
      let(:target) { build_product(real_value: 1.0, real_unit: 'mol', molecule: molecule) }
      let(:other_user) { create(:user) }

      it 'raises a MergeError with http_status 401' do
        expect do
          described_class.new(current_user: other_user)
                         .merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
        end.to raise_error(SampleMergeService::MergeError) { |e| expect(e.http_status).to eq(401) }
      end
    end

    context 'when both reactants share the same molecule' do
      let(:source) { build_reactant(real_value: 2.0, real_unit: 'mol', molecule: molecule) }
      let(:target) { build_reactant(real_value: 3.0, real_unit: 'mol', molecule: molecule) }

      it 'adds the source amount into the target' do
        result = service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)

        expect(result.real_amount_value).to eq(5.0)
        expect(result.real_amount_unit).to eq('mol')
      end

      it 'marks the source as legacy and removes its reactant row' do
        service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)

        expect(source.reload.is_legacy).to be true
        expect(reaction.reactions_reactant_samples.exists?(sample_id: source.id)).to be false
      end
    end

    context 'when source is a product and target is a reactant' do
      let(:source) { build_product(real_value: 1.0, real_unit: 'mol', molecule: molecule) }
      let(:target) { build_reactant(real_value: 1.0, real_unit: 'mol', molecule: molecule) }

      it 'raises a MergeError' do
        expect do
          service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id)
        end.to raise_error(SampleMergeService::MergeError, /same material group/)
      end
    end
  end

  describe '#unmerge!' do
    let(:source) { build_product(real_value: 2.0, real_unit: 'mol', molecule: molecule) }
    let(:target) { build_product(real_value: 3.0, real_unit: 'mol', molecule: molecule) }

    before { service.merge!(source_id: source.id, target_id: target.id, reaction_id: reaction.id) }

    it 'restores the target amount and revives the source' do
      service.unmerge!(merge_id: SampleMerge.last.id)

      expect(target.reload.real_amount_value).to eq(3.0)
      expect(source.reload.is_legacy).to be false
      expect(reaction.reactions_product_samples.exists?(sample_id: source.id)).to be true
    end

    it 'removes the merge record' do
      expect { service.unmerge!(merge_id: SampleMerge.last.id) }.to change(SampleMerge, :count).by(-1)
    end

    context 'when the merged pair are reactants' do
      let(:source) { build_reactant(real_value: 2.0, real_unit: 'mol', molecule: molecule) }
      let(:target) { build_reactant(real_value: 3.0, real_unit: 'mol', molecule: molecule) }

      it 'restores the target amount and revives the source as a reactant' do
        service.unmerge!(merge_id: SampleMerge.last.id)

        expect(target.reload.real_amount_value).to eq(3.0)
        expect(source.reload.is_legacy).to be false
        expect(reaction.reactions_reactant_samples.exists?(sample_id: source.id)).to be true
      end
    end

    context 'when the target has itself been merged upstream (chained merge)' do
      let(:outer_target) { build_product(real_value: 5.0, real_unit: 'mol', molecule: molecule) }

      before { service.merge!(source_id: target.id, target_id: outer_target.id, reaction_id: reaction.id) }

      it 'raises a MergeError and does not corrupt the outer target' do
        inner_merge_id = SampleMerge.find_by(source_sample_id: source.id).id

        expect do
          service.unmerge!(merge_id: inner_merge_id)
        end.to raise_error(SampleMergeService::MergeError, /merged upstream/)

        # outer_target was 5 + (2+3) = 10 after both merges; guard must leave it untouched
        expect(outer_target.reload.real_amount_value).to eq(10.0)
      end
    end
  end
end
