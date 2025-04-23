# frozen_string_literal: true

require 'rails_helper'

# rubocop: disable Style/OpenStructUse, RSpec/MultipleMemoizedHelpers

describe Usecases::Reactions::UpdateMaterials do
  let(:user) { create(:user) }
  let(:collection) { create(:collection, label: 'Collection', user: user) }
  let(:reaction) { create(:reaction, name: 'Reaction', collections: [collection]) }
  let(:vessel_size) { { 'amount' => 100, 'unit' => 'ml' } }
  let(:reaction_with_vessel_volume) do
    create(:reaction, name: 'Reaction', collections: [collection], vessel_size: vessel_size)
  end
  let(:root_container) { create(:root_container) }
  let(:sample) { create(:sample, name: 'Sample1', container: create(:container)) }
  let(:sample2) { create(:sample, name: 'Sample2', container: create(:container)) }
  let(:gas_phase_data) do
    {
      'time' => { 'unit' => 'h', 'value' => nil },
      'temperature' => { 'unit' => '°C', 'value' => 1 },
      'turnover_number' => nil,
      'part_per_million' => 1,
      'turnover_frequency' => { 'unit' => 'TON/h', 'value' => nil },
    }
  end
  let(:product_sample) do
    create(:reactions_product_sample,
           reaction: reaction,
           sample: sample,
           gas_phase_data: gas_phase_data)
  end

  let(:molfile) { build(:molfile, type: 'test_2') }
  let(:starting_materials) do
    {
      'starting_materials' => [
        'id' => sample.id,
        'name' => 'starting_material',
        'target_amount_unit' => 'mg',
        'target_amount_value' => 75.09596,
        'equivalent' => 1,
        'reference' => false,
        'is_new' => false,
        'molfile' => molfile,
        'container' => root_container,
      ],
    }
  end
  let(:reactants) do
    {
      'reactants' => [
        'target_amount_unit' => 'mg',
        'target_amount_value' => 86.09596,
        'equivalent' => 2,
        'reference' => false,
        'is_new' => true,
        'molfile' => molfile,
        'container' => root_container,
        'parent_id' => sample2.id, # gets named after parent, hence no name specified
      ],
    }
  end
  let(:products) do
    {
      'products' => [
        'name' => 'product',
        'target_amount_unit' => 'mg',
        'target_amount_value' => 99.08304,
        'real_amount_unit' => nil,
        'real_amount_value' => nil,
        'equivalent' => 5.5,
        'reference' => false,
        'is_new' => true,
        'molfile' => molfile,
        'container' => root_container,
        'gas_phase_data' => gas_phase_data,
      ],
    }
  end

  let(:product_material) do
    OpenStruct.new(
      name: 'product',
      target_amount_unit: 'mol',
      target_amount_value: 10,
      real_amount_unit: nil,
      real_amount_value: nil,
      gas_phase_data: gas_phase_data,
    )
  end

  let(:product_material_with_real_amount_value) do
    OpenStruct.new(
      name: 'another product',
      real_amount_unit: 'mol',
      real_amount_value: 10,
      gas_phase_data: gas_phase_data,
    )
  end

  let(:mixed_materials) do
    {
      'solvents' => [
        'name' => 'solvent',
        'target_amount_unit' => 'mg',
        'target_amount_value' => 76.09596,
        'equivalent' => 1,
        'reference' => true,
        'is_new' => true,
        'molfile' => molfile,
        'container' => root_container,
      ],
    }.merge(starting_materials, reactants, products)
  end
  let(:class_instance) { described_class.new(reaction, products, user, vessel_size) }
  let(:class_instance_with_vessel_volume) do
    described_class.new(reaction_with_vessel_volume, products, user, vessel_size)
  end

  describe '#execute!' do
    let(:samples) { mixed_materials }

    before do |example|
      ReactionsStartingMaterialSample.create!(
        reaction: reaction, sample: sample, reference: true, equivalent: 1,
      )
      allow(SVG::ReactionComposer).to receive(:new) if example.metadata[:svg_update]
      described_class.new(reaction, samples, user, vessel_size).execute!
    end

    it 'associates reaction with materials' do
      counts = [ReactionsSample, ReactionsStartingMaterialSample, ReactionsReactantSample,
                ReactionsSolventSample, ReactionsProductSample].map(&:count)
      expect(counts).to contain_exactly(4, 1, 1, 1, 1)
      expect(reaction.reactions_samples).to match_array(ReactionsSample.all)
    end

    context 'when sample exists' do
      let(:samples) { starting_materials } # hits .update_existing_sample

      it 'does not update reaction-SVG from sample model', :svg_update do
        # Capturing SVG::ReactionComposer:new is the most straightforward way
        # I could think of to test updates to the reaction-SVG.
        # Since the updates to the reaction-SVG are a side-effect they are difficult to test.
        # only one final update to reaction-SVG once reaction is saved
        expect(SVG::ReactionComposer).to have_received(:new).once
      end

      it 'updates the sample' do
        # RSpec creates `sample` fixture, and UpdateMaterials update it
        expect(Sample.count).to eq(1)
        expect(Sample.find_by(name: 'starting_material').target_amount_value).to eq(75.09596)
      end
    end

    context 'when sample is new and not a product' do
      let(:samples) { reactants } # hits .create_sub_sample

      it 'creates sub-sample for sample with parent' do
        # RSpec creates `sample` fixture (parent), UpdateMaterials derive new sample from it
        expect(Sample.count).to eq(2)
        expect(Sample.find_by(short_label: 'reactant').target_amount_value).to eq(86.09596)
      end
    end

    context 'when sample is a new product' do
      let(:samples) { products } # hits .create_new_sample

      it 'creates new sample' do
        expect(Sample.count).to eq(1) # UpdateMaterials create new sample
        expect(Sample.find_by(name: 'product').target_amount_value).to eq(99.08304)
      end
    end

    context 'when vessel volume is valid' do
      it 'returns the calculated mole gas product' do
        result = class_instance.send(:update_mole_gas_product, product_sample, 80)
        expect(result).to eq(3.5543368129550247e-06)
      end
    end

    context 'when vessel volume is nil' do
      it 'returns nil' do
        result = class_instance.send(:update_mole_gas_product, product_sample, nil)
        expect(result).to be_nil
      end
    end

    context 'when updating samples using set_mole_value_gas_product' do
      it 'returns nil when reaction vessel size amount is nil' do
        result = class_instance.send(:set_mole_value_gas_product, sample, product_material)
        expect(result).to be_nil
      end

      it 'calls #update_mole_gas_product when reaction vessel size amount is not nil' do
        result = class_instance_with_vessel_volume.send(:set_mole_value_gas_product, sample, product_material)
        expect(result).not_to be_nil
      end

      it 'updates real_amount_value of product sample' do
        class_instance_with_vessel_volume.send(:set_mole_value_gas_product, sample,
                                               product_material_with_real_amount_value)
        expect(sample.real_amount_value).to eq(4.442921016193781e-09)
      end
    end
  end
end

# rubocop:enable Style/OpenStructUse, RSpec/MultipleMemoizedHelpers
