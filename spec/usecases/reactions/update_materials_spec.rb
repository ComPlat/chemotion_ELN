# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Reactions::UpdateMaterials do
  let(:user) { create(:user) }
  let(:collection) { Collection.create!(label: 'Collection', user: user) }
  let(:reaction) { create(:reaction, name: 'Reaction', collections: [collection]) }
  let(:root_container) { create(:root_container) }
  let(:sample) { create(:sample, name: 'Sample', container: FactoryBot.create(:container)) }
  let(:molfile) { File.read(Rails.root + 'spec/fixtures/test_2.mol') }
  let(:starting_materials) do
    {
      'starting_materials' => [
        # hits existing_sample branch
        'id' => sample.id,
        'name' => 'starting_material',
        'target_amount_unit' => 'mg',
        'target_amount_value' => 75.09596,
        'equivalent' => 1,
        'reference' => false,
        'is_new' => false,
        'molfile' => molfile,
        'container' => root_container
      ]
    }
  end
  let(:reactants) do
    {
      'reactants' => [
        # hits subsample branch
        'target_amount_unit' => 'mg',
        'target_amount_value' => 86.09596,
        'equivalent' => 2,
        'reference' => false,
        'is_new' => true,
        'molfile' => molfile,
        'container' => root_container,
        'parent_id' => sample.id # gets named after parent, hence no name specified
      ]
    }
  end
  let(:products) do
    {
      'products' => [
        # hits new_sample branch
        'name' => 'product',
        'target_amount_unit' => 'mg',
        'target_amount_value' => 99.08304,
        'equivalent' => 5.5,
        'reference' => false,
        'is_new' => true,
        'molfile' => molfile,
        'container' => root_container
      ]
    }
  end
  let(:materials) do
    {
      'solvents' => [
        # hits new_sample branch
        'name' => 'solvent',
        'target_amount_unit' => 'mg',
        'target_amount_value' => 76.09596,
        'equivalent' => 1,
        'reference' => true,
        'is_new' => true,
        'molfile' => molfile,
        'container' => root_container
      ]
    }.merge(starting_materials, reactants, products)
  end

  describe '#execute!' do
    context 'when sample exists' do
      it 'updates the sample' do
        described_class.new(reaction, starting_materials, user).execute!
        expect(Sample.count).to eq(1) # RSpec creates `sample` fixture, and ReactionHelpers update it
        expect(Sample.find_by(name: 'starting_material').target_amount_value).to eq(75.09596)
      end
    end

    context 'when sample is new' do
      it 'creates sub-sample for sample with parent that are not products' do
        described_class.new(reaction, reactants, user).execute!
        expect(Sample.count).to eq(2) # RSpec creates `sample` fixture (parent), ReactionHelpers derive new sample from it
        expect(Sample.find_by(short_label: 'reactant').target_amount_value).to eq(86.09596)
      end

      it 'creates new sample for samples that are products' do
        described_class.new(reaction, products, user).execute!
        expect(Sample.count).to eq(1) # ReactionHelpers create new sample
        expect(Sample.find_by(name: 'product').target_amount_value).to eq(99.08304)
      end
    end

    it 'associates reaction with materials' do
      described_class.new(reaction, materials, user).execute!
      expect(ReactionsSample.count).to eq(4)
      expect(ReactionsStartingMaterialSample.count).to eq(1)
      expect(ReactionsReactantSample.count).to eq(1)
      expect(ReactionsSolventSample.count).to eq(1)
      expect(ReactionsProductSample.count).to eq(1)
      expect(reaction.reactions_samples).to eq(ReactionsSample.all)
    end
  end
end
