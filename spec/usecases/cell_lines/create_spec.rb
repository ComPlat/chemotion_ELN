# frozen_string_literal: true

# rubocop:disable RSpec/NestedGroups
require 'spec_helper'

RSpec.describe Usecases::CellLines::Create do
  let(:user) { create(:user) }
  let(:cell_line_sample) { use_case.execute! }
  let(:use_case) { described_class.new(params, user) }
  let(:collection) { create(:collection) }

  let(:params) do
    {
      amount: 100,
      passage: 42,
      contamination: 'something',
      source: 'IPB',
      growth_medium: 'water',
      name: 'probe-123',
      unit: 'g',
      description: 'none',
      material_names: 'name-001;name-002',
      cell_type: 'primary cells',
      organism: 'mouse',
      tissue: 'leg',
      disease: 'cancer',
      biosafety_level: 'S0',
      variant: 'v1',
      optimal_growth_temp: 36.3,
      cryo_pres_medium: 'nitrogen',
      gender: 'male',
      material_description: 'a cell',
      collection_id: collection.id,
    }
  end

  describe 'execute!' do
    context 'when input is not valid' do
      context 'when amount is negative' do
        before do
          params[:amount] = -1
        end

        it 'error message delivered' do
          expect { cell_line_sample }.to raise_error(RuntimeError, 'amount not valid')
        end
      end

      context 'when amount present' do
        before do
          params.delete(:amount)
        end

        it 'error message delivered' do
          expect { cell_line_sample }.to raise_error(RuntimeError, 'amount not valid')
        end
      end

      context 'when amount is no number' do
        before do
          params[:amount] = 'xcv'
        end

        it 'error message delivered' do
          expect { cell_line_sample }.to raise_error(RuntimeError, 'amount not valid')
        end
      end

      context 'when cell line name is absent' do
        before do
          params.delete(:material_names)
        end

        it 'error message delivered' do
          expect { cell_line_sample }.to raise_error(RuntimeError, 'material name not valid')
        end
      end

      context 'when cell line name is empty' do
        before do
          params[:material_names] = []
        end

        it 'error message delivered' do
          expect { cell_line_sample }.to raise_error(RuntimeError, 'material name not valid')
        end
      end

      context 'when cell line name is not a string' do
        before do
          params[:material_names] = [1]
        end

        it 'error message delivered' do
          expect { cell_line_sample }.to raise_error(RuntimeError, 'material name not valid')
        end
      end
    end

    context 'when cell line material does already exist' do
      let(:loaded_cell_line_sample) { CelllineSample.find(cell_line_sample.id) }
      let(:loaded_cell_line_material) { CelllineMaterial.find(loaded_cell_line_sample.cellline_material_id) }

      before do
        params[:material_names] = 'name-001'
        create(:cellline_material)
        params[:variant] = 'v0'
      end

      it 'cell line sample was saved' do # rubocop:disable RSpec/MultipleExpectations
        expect(loaded_cell_line_sample).not_to be_nil
        expect(loaded_cell_line_sample.amount).to be 100
        expect(loaded_cell_line_sample.passage).to be 42
        expect(loaded_cell_line_sample.contamination).to eq('something')
        expect(loaded_cell_line_sample.name).to eq('probe-123')
        expect(loaded_cell_line_sample.description).to eq('none')
      end

      it 'cell line counter was increased' do
        expect { loaded_cell_line_material }.to change(user, :counters)
      end

      it 'new cell line material was not saved' do # rubocop:disable RSpec/MultipleExpectations
        expect(loaded_cell_line_material).not_to be_nil
        expect(loaded_cell_line_material.name).to eq('name-001')
        expect(loaded_cell_line_material.cell_type).to eq('primary cells')
        expect(loaded_cell_line_material.organism).to eq('mouse')
        expect(loaded_cell_line_material.tissue).to eq('leg')
        expect(loaded_cell_line_material.disease).to eq('cancer')
        expect(loaded_cell_line_material.biosafety_level).to eq('S0')
        expect(loaded_cell_line_material.variant).to eq('v0')
        expect(loaded_cell_line_material.optimal_growth_temp).to eq(36.3)
        expect(loaded_cell_line_material.cryo_pres_medium).to eq('nitrogen')
        expect(loaded_cell_line_material.gender).to eq('male')
        expect(loaded_cell_line_material.description).to eq('a cell')
      end

      it 'no new cell line material was created, old one was used' do
        expect { cell_line_sample }.not_to change(CelllineMaterial, :count)
      end
    end

    context 'when cell line material does not yet exist' do
      let(:loaded_cell_line_sample) { CelllineSample.find(cell_line_sample.id) }
      let(:loaded_cell_line_material) { CelllineMaterial.find(loaded_cell_line_sample.cellline_material_id) }

      it 'cell line sample was saved' do # rubocop:disable RSpec/MultipleExpectations
        expect(loaded_cell_line_sample).not_to be_nil
        expect(loaded_cell_line_sample.amount).to be 100
        expect(loaded_cell_line_sample.passage).to be 42
        expect(loaded_cell_line_sample.contamination).to eq('something')
        expect(loaded_cell_line_sample.name).to eq('probe-123')
        expect(loaded_cell_line_sample.description).to eq('none')
      end

      it 'new cell line material was saved' do # rubocop:disable RSpec/MultipleExpectations
        expect(loaded_cell_line_material).not_to be_nil
        expect(loaded_cell_line_material.growth_medium).to eq('water')
        expect(loaded_cell_line_material.name).to eq('name-001;name-002')
        expect(loaded_cell_line_material.cell_type).to eq('primary cells')
        expect(loaded_cell_line_material.organism).to eq('mouse')
        expect(loaded_cell_line_material.tissue).to eq('leg')
        expect(loaded_cell_line_material.disease).to eq('cancer')
        expect(loaded_cell_line_material.biosafety_level).to eq('S0')
        expect(loaded_cell_line_material.variant).to eq('v1')
        expect(loaded_cell_line_material.optimal_growth_temp).to eq(36.3)
        expect(loaded_cell_line_material.cryo_pres_medium).to eq('nitrogen')
        expect(loaded_cell_line_material.gender).to eq('male')
        expect(loaded_cell_line_material.description).to eq('a cell')
      end

      it 'a new cell line material was created' do
        expect { cell_line_sample }.to change(CelllineMaterial, :count)
      end
    end
  end
end

# rubocop:enable RSpec/NestedGroups
