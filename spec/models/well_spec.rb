# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Well do
  let(:collection) { create(:collection) }
  let(:wellplate) { create(:wellplate, collections: [collection]) }
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

  describe '.get_samples_in_wellplates()' do
    context 'when no sample is attached' do
      it 'empty array is returned' do
        expect(described_class.get_samples_in_wellplates(wellplate.id)).to eq([])
      end
    end

    context 'when 3 samples are attached' do
      let(:sample1) { create(:sample, collections: [collection]) }
      let(:sample2) { create(:sample, collections: [collection]) }
      let(:sample3) { create(:sample, collections: [collection]) }

      let(:well1) { create(:well, sample_id: sample1.id, wellplate_id: wellplate.id) }
      let(:well2) { create(:well, sample_id: sample2.id, wellplate_id: wellplate.id) }
      let(:well3) { create(:well, sample_id: sample3.id, wellplate_id: wellplate.id) }

      it 'three sample ids are returned' do
        expected = [well1.sample_id, well2.sample_id, well3.sample_id]
        expect(described_class.get_samples_in_wellplates(wellplate.id)).to eq(expected)
      end
    end
  end
end
