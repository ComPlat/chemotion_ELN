# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Well do
  let(:collection) { create(:collection) }
  let(:screen)     { create(:screen, collections: [collection]) }
  let(:research_plan) { create(:research_plan, collections: [collection]) }
  let(:wellplate) do
    create(:wellplate, collections: [collection], screens: [screen], research_plans: [research_plan])
  end
  let(:sample) { create(:sample, collections: [collection]) }
  let(:well) do
    create(:well, sample_id: sample.id, wellplate_id: wellplate.id)
  end

  describe '.readouts()' do
    context 'when readout are valid' do
      it 'returns the readout of the well' do
        expect(well.readouts).to eq([{ 'value' => '98.34', 'unit' => '%' }, { 'value' => '50', 'unit' => 'µM' }])
      end
    end
  end

  describe '.alphanumeric_position()' do
    context 'when position is [1,1]' do
      let(:well) do
        create(:well, wellplate_id: wellplate.id, position_x: 1, position_y: 1)
      end

      it 'returns the string A01' do
        expect(well.alphanumeric_position).to eq('A1')
      end
    end

    context 'when position is [30,30]' do
      let(:well) do
        create(:well, wellplate_id: wellplate.id, position_x: 30, position_y: 30)
      end

      it 'returns the string AD30' do
        expect(well.sortable_alphanumeric_position).to eq('AD30')
      end
    end
  end

  describe '.sortable_alphanumeric_position()' do
    context 'when position is [1,1]' do
      let(:well) do
        create(:well, wellplate_id: wellplate.id, position_x: 1, position_y: 1)
      end

      it 'returns the string A01' do
        expect(well.sortable_alphanumeric_position).to eq('A01')
      end
    end

    context 'when position is [30,30]' do
      let(:well) do
        create(:well, wellplate_id: wellplate.id, position_x: 30, position_y: 30)
      end

      it 'returns the string AD30' do
        expect(well.sortable_alphanumeric_position).to eq('AD30')
      end
    end
  end
end
