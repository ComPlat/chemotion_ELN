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

    # Bug fix: equivalent was not written to DB for existing product associations (was commented out).
    # After save, yield reset to 0% because the join table kept the stale value.
    context 'when an existing product association is updated' do
      let(:existing_product_sample) { create(:sample, name: 'existing_product', container: create(:container)) }
      let!(:existing_association) do
        create(:reactions_product_sample, reaction: reaction, sample: existing_product_sample, equivalent: 0.3)
      end
      let(:updated_product_materials) do
        {
          'products' => [
            'id' => existing_product_sample.id,
            'name' => 'existing_product',
            'target_amount_unit' => 'mg',
            'target_amount_value' => 50.0,
            'equivalent' => 0.75,
            'reference' => false,
            'is_new' => false,
            'molfile' => molfile,
            'container' => root_container,
            'gas_phase_data' => gas_phase_data,
          ],
        }
      end

      before do
        allow(SVG::ReactionComposer).to receive(:new).and_return(
          double(compose_reaction_svg_and_save: nil)
        )
        described_class.new(reaction, updated_product_materials, user, vessel_size).execute!
      end

      it 'persists the updated equivalent to the join table' do
        updated = ReactionsSample.find_by(sample_id: existing_product_sample.id, reaction_id: reaction.id)
        expect(updated.equivalent).to eq(0.75)
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

    context 'when sample is a new mixture sub-sample' do
      let(:molecule_a) { create(:molecule) }
      let(:molecule_b) { create(:molecule) }
      let(:mixture_parent) do
        create(:sample, name: 'MixtureParent',
                        sample_type: Sample::SAMPLE_TYPE_MIXTURE,
                        container: create(:container))
      end
      let!(:parent_component_a) do
        create(:component, sample: mixture_parent, name: 'Comp A', position: 0,
                           component_properties: { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 })
      end
      let!(:parent_component_b) do
        create(:component, sample: mixture_parent, name: 'Comp B', position: 1,
                           component_properties: { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 })
      end
      # Mirrors the front-end payload for a freshly dragged-in mixture: a new
      # split sub-sample whose serialized components still carry the parent's
      # component ids.
      let(:samples) do
        {
          'reactants' => [
            {
              'target_amount_unit' => 'mg',
              'target_amount_value' => 86.09596,
              'equivalent' => 1,
              'reference' => false,
              'is_new' => true,
              'molfile' => molfile,
              'container' => root_container,
              'parent_id' => mixture_parent.id,
              'sample_type' => Sample::SAMPLE_TYPE_MIXTURE,
              'components' => [
                {
                  'id' => parent_component_a.id,
                  'name' => 'Comp A',
                  'position' => 0,
                  'component_properties' => { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 },
                },
                {
                  'id' => parent_component_b.id,
                  'name' => 'Comp B',
                  'position' => 1,
                  'component_properties' => { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 },
                },
              ],
            },
          ],
        }
      end

      it 'copies the parent components onto the sub-sample without duplicating them' do
        subsample = Sample.find_by(short_label: 'reactant')

        expect(subsample).to be_present
        expect(Component.where(sample_id: subsample.id).count).to eq(2)
      end
    end

    context 'when a new mixture sub-sample carries client-edited components' do
      let(:molecule_a) { create(:molecule) }
      let(:molecule_b) { create(:molecule) }
      let(:mixture_parent) do
        create(:sample, name: 'MixtureParent',
                        sample_type: Sample::SAMPLE_TYPE_MIXTURE,
                        container: create(:container))
      end
      let!(:parent_component_a) do
        create(:component, sample: mixture_parent, name: 'Comp A', position: 0,
                           component_properties: { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 })
      end
      let!(:parent_component_b) do
        create(:component, sample: mixture_parent, name: 'Comp B', position: 1,
                           component_properties: { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 })
      end
      # The user renamed Comp A and changed its amount before the first save; the
      # payload carries the edited values while still referencing the parent's ids.
      let(:samples) do
        {
          'reactants' => [
            {
              'target_amount_unit' => 'mg',
              'target_amount_value' => 86.09596,
              'equivalent' => 1,
              'reference' => false,
              'is_new' => true,
              'molfile' => molfile,
              'container' => root_container,
              'parent_id' => mixture_parent.id,
              'sample_type' => Sample::SAMPLE_TYPE_MIXTURE,
              'components' => [
                {
                  'id' => parent_component_a.id,
                  'name' => 'Comp A (edited)',
                  'position' => 0,
                  'component_properties' => { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.5 },
                },
                {
                  'id' => parent_component_b.id,
                  'name' => 'Comp B',
                  'position' => 1,
                  'component_properties' => { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 },
                },
              ],
            },
          ],
        }
      end

      it 'persists the client-edited component values, not the parent copies' do
        subsample = Sample.find_by(short_label: 'reactant')
        components = Component.where(sample_id: subsample.id).order(:position)

        expect(components.count).to eq(2)
        expect(components.first.name).to eq('Comp A (edited)')
        expect(components.first.component_properties['amount_mol']).to eq(0.5)
      end
    end

    context 'when an existing mixture sample has a component removed' do
      let(:molecule_a) { create(:molecule) }
      let(:molecule_b) { create(:molecule) }
      # Build the sample with both components here (not via let!) so they exist
      # before the shared `before` hook runs execute! — the removed one (Comp B) is
      # not referenced in the payload, so a let! would create it after execute! and
      # mask the deletion.
      let(:mixture_sample) do
        s = create(:sample, name: 'Mixture',
                            sample_type: Sample::SAMPLE_TYPE_MIXTURE,
                            container: create(:container))
        create(:component, sample: s, name: 'Comp A', position: 0,
                           component_properties: { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 })
        create(:component, sample: s, name: 'Comp B', position: 1,
                           component_properties: { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 })
        s
      end
      let(:component_a) { mixture_sample.components.find_by(name: 'Comp A') }
      # The client removed Comp B in the reaction editor: only Comp A remains.
      let(:samples) do
        {
          'starting_materials' => [
            {
              'id' => mixture_sample.id,
              'name' => 'Mixture',
              'target_amount_unit' => 'mg',
              'target_amount_value' => 75.09596,
              'equivalent' => 1,
              'reference' => false,
              'is_new' => false,
              'molfile' => molfile,
              'container' => root_container,
              'sample_type' => Sample::SAMPLE_TYPE_MIXTURE,
              'components' => [
                {
                  'id' => component_a.id,
                  'name' => 'Comp A',
                  'position' => 0,
                  'component_properties' => { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 },
                },
              ],
            },
          ],
        }
      end

      it 'deletes the removed component' do
        expect(Component.where(sample_id: mixture_sample.id).pluck(:name)).to contain_exactly('Comp A')
      end
    end

    context 'when an existing mixture sample has all components cleared' do
      let(:molecule_a) { create(:molecule) }
      let(:molecule_b) { create(:molecule) }
      let(:mixture_sample) do
        s = create(:sample, name: 'Mixture',
                            sample_type: Sample::SAMPLE_TYPE_MIXTURE,
                            container: create(:container))
        create(:component, sample: s, name: 'Comp A', position: 0,
                           component_properties: { 'molecule_id' => molecule_a.id, 'amount_mol' => 0.1 })
        create(:component, sample: s, name: 'Comp B', position: 1,
                           component_properties: { 'molecule_id' => molecule_b.id, 'amount_mol' => 0.2 })
        s
      end
      # The client cleared every component; it sends an explicit empty array, which
      # must reconcile to zero persisted components (nil would instead be skipped).
      let(:samples) do
        {
          'starting_materials' => [
            {
              'id' => mixture_sample.id,
              'name' => 'Mixture',
              'target_amount_unit' => 'mg',
              'target_amount_value' => 75.09596,
              'equivalent' => 1,
              'reference' => false,
              'is_new' => false,
              'molfile' => molfile,
              'container' => root_container,
              'sample_type' => Sample::SAMPLE_TYPE_MIXTURE,
              'components' => [],
            },
          ],
        }
      end

      it 'deletes all persisted components' do
        expect(Component.where(sample_id: mixture_sample.id).count).to eq(0)
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

  describe 'weight-percentage validation methods' do
    let(:reaction_with_weight_percentage) do
      create(:reaction, name: 'WP Reaction', collections: [collection], weight_percentage: true)
    end
    let(:reference_record) do
      ReactionsProductSample.find_by(reaction: reaction_with_weight_percentage, sample: reference_sample)
    end
    let(:test_material) do
      OpenStruct.new(
        weight_percentage: 0.3,
        target_amount_value: 30.0,
        target_amount_unit: 'g',
      )
    end
    let(:class_instance_wp) do
      described_class.new(reaction_with_weight_percentage, {}, user, vessel_size)
    end
    let(:reference_sample) { create(:sample, target_amount_value: 100.0, target_amount_unit: 'g') }
    let(:material_sample) { create(:sample, target_amount_value: 50.0, target_amount_unit: 'g') }

    before do
      create(:reactions_product_sample,
             reaction: reaction_with_weight_percentage,
             sample: reference_sample,
             weight_percentage_reference: true)
    end

    describe '#find_weight_percentage_reference_record' do
      it 'finds the weight percentage reference record for the reaction' do
        result = class_instance_wp.send(:find_weight_percentage_reference_record)
        expect(result).to eq(reference_record)
        expect(result.weight_percentage_reference).to be true
      end

      it 'returns nil when no weight percentage reference exists' do
        reference_record.update(weight_percentage_reference: false)
        result = class_instance_wp.send(:find_weight_percentage_reference_record)
        expect(result).to be_nil
      end
    end

    describe '#skip_weight_percentage_update?' do
      it 'returns true when weight percentage is nil' do
        material = OpenStruct.new(weight_percentage: nil)
        result = class_instance_wp.send(:skip_weight_percentage_update?, material)
        expect(result).to be true
      end

      it 'returns true when weight percentage is zero' do
        material = OpenStruct.new(weight_percentage: 0.0)
        result = class_instance_wp.send(:skip_weight_percentage_update?, material)
        expect(result).to be true
      end

      it 'returns false when weight percentage is positive' do
        result = class_instance_wp.send(:skip_weight_percentage_update?, test_material)
        expect(result).to be false
      end
    end

    describe '#apply_weight_percentage' do
      it 'calculates the correct amount using weight percentage' do
        result = class_instance_wp.send(:apply_weight_percentage, 100.0, 0.25)
        expect(result).to eq(25.0)
      end

      it 'works with decimal weight percentages' do
        result = class_instance_wp.send(:apply_weight_percentage, 200.0, 0.15)
        expect(result).to eq(30.0)
      end
    end

    describe '#assign_weight_percentage_amounts' do
      let(:target_sample) { create(:sample, target_amount_value: 100, real_amount_value: 0.0) }
      let(:target_reactions_sample) do
        ReactionsProductSample.find_by(reaction: reaction_with_weight_percentage, sample: target_sample)
      end
      let(:source_sample) { OpenStruct.new(target_amount_unit: 'mg', real_amount_unit: 'mg', weight_percentage: 0.4) }

      before do
        create(:reactions_product_sample,
               reaction: reaction_with_weight_percentage,
               sample: target_sample,
               weight_percentage: 15.0)
      end

      it 'assigns calculated amounts to target sample' do
        target_amount = { value: reference_sample.target_amount_value, unit: reference_sample.target_amount_unit }
        result = class_instance_wp.send(:assign_weight_percentage_amounts, target_sample, target_amount, 0.4)
        expect(result).to eq(target_sample)
        expect(target_sample.target_amount_value).to eq(40.0)
        expect(target_sample.target_amount_unit).to eq(reference_sample.target_amount_unit)
      end

      it 'preserves reference record units' do
        reference_sample.update(target_amount_unit: 'mg', real_amount_unit: 'mg')
        target_amount = { value: reference_sample.target_amount_value, unit: reference_sample.target_amount_unit }

        class_instance_wp.send(:assign_weight_percentage_amounts, target_sample, target_amount, 0.4)

        expect(target_sample.target_amount_unit).to eq('mg')
        expect(target_sample.real_amount_unit).to eq('mg')
      end
    end
  end

  describe 'integration with weight-percentage workflow' do
    let(:reaction_with_wp) do
      create(:reaction, name: 'WP Integration', collections: [collection], weight_percentage: true)
    end
    let(:wp_reference_record) do
      ReactionsProductSample.find_by(reaction: reaction_with_wp, sample: wp_reference_sample)
    end
    let(:wp_materials) do
      {
        'reactants' => [
          {
            'id' => sample2.id,
            'name' => 'wp_reactant',
            'target_amount_unit' => 'g',
            'target_amount_value' => 60.0,
            'equivalent' => 0.5,
            'reference' => false,
            'is_new' => false,
            'weight_percentage' => 0.25,
            'molfile' => molfile,
            'container' => root_container,
          },
        ],
        'products' => [
          {
            'id' => wp_reference_sample.id,
            'name' => 'wp_reference',
            'target_amount_unit' => wp_reference_sample.target_amount_unit,
            'target_amount_value' => wp_reference_sample.target_amount_value,
            'is_new' => false,
            'weight_percentage_reference' => true,
            'container' => root_container,
          },
        ],
      }
    end

    let(:wp_reference_sample) { create(:sample, target_amount_value: 200.0, target_amount_unit: 'g') }

    before do
      create(:reactions_product_sample,
             reaction: reaction_with_wp,
             sample: wp_reference_sample,
             weight_percentage_reference: true)
    end

    it 'applies weight percentage calculations during reaction update', :svg_update do
      allow(SVG::ReactionComposer).to receive(:new)

      # Create a reactions sample with weight percentage to simulate the flow
      create(:reactions_reactant_sample,
             reaction: reaction_with_wp,
             sample: sample2,
             weight_percentage: 0.25)

      described_class.new(reaction_with_wp, wp_materials, user, vessel_size).execute!

      # Find the updated sample
      updated_sample = Sample.find(sample2.id)

      # Verify that weight percentage calculation was applied
      # 200.0 * 0.25 = 50.0
      expect(updated_sample.target_amount_value).to eq(50.0)
      expect(updated_sample.real_amount_value).to eq(50.0)
      expect(updated_sample.target_amount_unit).to eq(wp_reference_sample.target_amount_unit)
    end
  end
end

# rubocop:enable Style/OpenStructUse, RSpec/MultipleMemoizedHelpers
