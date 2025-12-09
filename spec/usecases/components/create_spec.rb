# frozen_string_literal: true

require 'spec_helper'

# Test suite for Usecases::Components::Create
#
# This UseCase handles creating and updating components for mixture samples.
# Key business rules:
# 1. Only mixture samples can have components
# 2. Relative molecular weight is automatically calculated for mixture components
# 3. Formula: relative_mw = total_mixture_mass_g / component_amount_mol (g/mol)
#
RSpec.describe Usecases::Components::Create do
  let(:user) { create(:user) }
  let(:molecule_1) { create(:molecule) }
  let(:molecule_2) { create(:molecule) }
  let(:sample) { create(:sample, sample_type: sample_type) }
  let(:use_case) { described_class.new(sample, components_params) }

  describe '#execute!' do
    context 'when sample is a mixture' do
      let(:sample_type) { Sample::SAMPLE_TYPE_MIXTURE }

      before do
        # Mock sample_details with total mixture mass
        sample_details_double = instance_double(Hash)
        allow(sample_details_double).to receive(:dig).with('total_mixture_mass_g').and_return(total_mixture_mass)
        allow(sample).to receive(:sample_details).and_return(sample_details_double)
      end

      context 'with valid total mixture mass and component amounts' do
        let(:total_mixture_mass) { 100.0 } # 100g total mixture mass
        let(:components_params) do
          [
            {
              id: 'new_1',
              name: 'Component 1',
              position: 1,
              component_properties: {
                molecule_id: molecule_1.id,
                amount_mol: 0.1, # Should result in relative_mw = 100/0.1 = 1000 g/mol
                amount_g: 50.0,
                purity: 0.95,
              },
            },
            {
              id: 'new_2',
              name: 'Component 2',
              position: 2,
              component_properties: {
                molecule_id: molecule_2.id,
                amount_mol: 0.2, # Should result in relative_mw = 100/0.2 = 500 g/mol
                amount_g: 50.0,
                purity: 0.98,
              },
            },
          ]
        end

        it 'creates components and calculates relative molecular weights' do
          expect { use_case.execute! }
            .to change(Component, :count).by(2)

          components = Component.where(sample_id: sample.id).order(:position)

          # First component
          expect(components.first.name).to eq('Component 1')
          expect(components.first.component_properties['amount_mol']).to eq(0.1)
          expect(components.first.component_properties['relative_molecular_weight']).to eq(1000.0)

          # Second component
          expect(components.second.name).to eq('Component 2')
          expect(components.second.component_properties['amount_mol']).to eq(0.2)
          expect(components.second.component_properties['relative_molecular_weight']).to eq(500.0)
        end
      end

      context 'with zero total mixture mass' do
        let(:total_mixture_mass) { 0.0 }
        let(:components_params) do
          [
            {
              id: 'new_1',
              name: 'Component 1',
              position: 1,
              component_properties: {
                molecule_id: molecule_1.id,
                amount_mol: 0.1,
                amount_g: 50.0,
              },
            },
          ]
        end

        it 'creates components without calculating relative molecular weights' do
          expect { use_case.execute! }
            .to change(Component, :count).by(1)

          component = Component.last
          expect(component.component_properties['relative_molecular_weight']).to be_nil
        end
      end

      context 'with nil total mixture mass' do
        let(:total_mixture_mass) { nil }
        let(:components_params) do
          [
            {
              id: 'new_1',
              name: 'Component 1',
              position: 1,
              component_properties: {
                molecule_id: molecule_1.id,
                amount_mol: 0.1,
                amount_g: 50.0,
              },
            },
          ]
        end

        it 'creates components without calculating relative molecular weights' do
          expect { use_case.execute! }
            .to change(Component, :count).by(1)

          component = Component.last
          expect(component.component_properties['relative_molecular_weight']).to be_nil
        end
      end

      context 'with zero or negative amount_mol' do
        let(:total_mixture_mass) { 100.0 }
        let(:components_params) do
          [
            {
              id: 'new_1',
              name: 'Component 1',
              position: 1,
              component_properties: {
                molecule_id: molecule_1.id,
                amount_mol: 0.0, # Zero amount_mol
                amount_g: 50.0,
              },
            },
            {
              id: 'new_2',
              name: 'Component 2',
              position: 2,
              component_properties: {
                molecule_id: molecule_2.id,
                amount_mol: -0.1, # Negative amount_mol
                amount_g: 50.0,
              },
            },
          ]
        end

        it 'creates components without calculating relative molecular weights for invalid amounts' do
          expect { use_case.execute! }
            .to change(Component, :count).by(2)

          components = Component.where(sample_id: sample.id)
          components.each do |component|
            expect(component.component_properties['relative_molecular_weight']).to be_nil
          end
        end
      end

      context 'with missing component_properties' do
        let(:total_mixture_mass) { 100.0 }
        let(:components_params) do
          [
            {
              id: 'new_1',
              name: 'Component 1',
              position: 1,
              component_properties: {
                molecule_id: molecule_1.id, # Include valid molecule_id
              },
            },
          ]
        end

        it 'skips relative molecular weight calculation and creates component safely' do
          # This should not raise an error due to the safety check
          expect { use_case.execute! }
            .to change(Component, :count).by(1)

          component = Component.last
          expect(component.name).to eq('Component 1')
          expect(component.component_properties['molecule_id']).to eq(molecule_1.id)
          expect(component.component_properties['molecule']).to be_present
        end
      end
    end

    context 'when updating existing components' do
      let(:sample_type) { Sample::SAMPLE_TYPE_MIXTURE }
      let(:total_mixture_mass) { 200.0 }
      let!(:existing_component) do
        create(:component,
               sample: sample,
               component_properties: { 'molecule_id' => molecule_1.id, 'amount_mol' => 0.05 })
      end

      let(:components_params) do
        [
          {
            id: existing_component.id,
            name: 'Updated Component',
            position: 1,
            component_properties: {
              molecule_id: molecule_1.id,
              amount_mol: 0.1, # Updated amount should result in relative_mw = 200/0.1 = 2000 g/mol
              amount_g: 100.0,
              purity: 0.99,
            },
          },
        ]
      end

      before do
        sample_details_double = instance_double(Hash)
        allow(sample_details_double).to receive(:dig).with('total_mixture_mass_g').and_return(total_mixture_mass)
        allow(sample).to receive(:sample_details).and_return(sample_details_double)
      end

      it 'updates existing component and recalculates relative molecular weight' do
        expect { use_case.execute! }
          .not_to(change(Component, :count))

        existing_component.reload
        expect(existing_component.name).to eq('Updated Component')
        expect(existing_component.component_properties['amount_mol']).to eq(0.1)
        expect(existing_component.component_properties['relative_molecular_weight']).to eq(2000.0)
      end
    end

    context 'when component creation fails' do
      let(:sample_type) { Sample::SAMPLE_TYPE_MIXTURE }
      let(:total_mixture_mass) { 100.0 }
      let(:components_params) do
        [
          {
            id: 'new_1',
            name: 'Invalid Component',
            position: 1,
            component_properties: {
              # Missing required molecule_id should cause validation to fail
              amount_mol: 0.1,
            },
          },
        ]
      end

      before do
        sample_details_double = instance_double(Hash)
        allow(sample_details_double).to receive(:dig).with('total_mixture_mass_g').and_return(total_mixture_mass)
        allow(sample).to receive(:sample_details).and_return(sample_details_double)
      end

      it 'raises ActiveRecord::RecordInvalid when validation fails' do
        expect do
          expect { use_case.execute! }
            .to raise_error(ActiveRecord::RecordInvalid)
        end.not_to change(Component, :count)
      end
    end
  end

  describe 'private methods' do
    describe '#calculate_relative_molecular_weights' do
      let(:sample_type) { Sample::SAMPLE_TYPE_MIXTURE }
      let(:total_mixture_mass) { 150.0 }

      before do
        sample_details_double = instance_double(Hash)
        allow(sample_details_double).to receive(:dig).with('total_mixture_mass_g').and_return(total_mixture_mass)
        allow(sample).to receive(:sample_details).and_return(sample_details_double)
      end

      it 'modifies component_properties hash in place' do
        components_params = [
          {
            id: 'new_1',
            name: 'Test Component',
            position: 1,
            component_properties: {
              molecule_id: molecule_1.id,
              amount_mol: 0.3,
            },
          },
        ]

        # The calculation should modify the hash in place
        expect(components_params.first[:component_properties][:relative_molecular_weight]).to be_nil

        use_case = described_class.new(sample, components_params)
        use_case.send(:calculate_relative_molecular_weights)

        expect(components_params.first[:component_properties][:relative_molecular_weight]).to eq(500.0)
      end
    end
  end
end
