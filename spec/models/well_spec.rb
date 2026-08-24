# frozen_string_literal: true

# == Schema Information
#
# Table name: wells
#
#  id           :integer          not null, primary key
#  additive     :string
#  color_code   :string
#  deleted_at   :datetime
#  label        :string           default("Molecular structure"), not null
#  position_x   :integer
#  position_y   :integer
#  readouts     :jsonb
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  sample_id    :integer
#  wellplate_id :integer          not null
#
# Indexes
#
#  index_wells_on_deleted_at    (deleted_at)
#  index_wells_on_sample_id     (sample_id)
#  index_wells_on_wellplate_id  (wellplate_id)
#
require 'rails_helper'

RSpec.describe Well do
  let(:collection) { create(:collection) }
  let(:wellplate) { create(:wellplate, collections: [collection]) }
  let(:well) do
    create(:well, wellplate_id: wellplate.id)
  end

  describe '.readouts()' do
    context 'when readout are valid' do
      it 'returns the readout of the well' do
        expect(well.readouts).to eq([{ 'value' => '98.34', 'unit' => '%' }, { 'value' => '50', 'unit' => 'µM' }])
      end
    end
  end

  describe '.alphanumeric_position()' do
    context 'when position is [nil,nil]' do
      let(:well) { create(:well, wellplate_id: wellplate.id, position_x: nil, position_y: nil) }

      it 'returns the string A01' do
        expect(well.alphanumeric_position).to eq('n/a')
      end
    end

    context 'when position is [1,1]' do
      let(:well) { create(:well, wellplate_id: wellplate.id, position_x: 1, position_y: 1) }

      it 'returns the string A01' do
        expect(well.alphanumeric_position).to eq('A1')
      end
    end

    context 'when position is [30,30]' do
      let!(:well) { create(:well, wellplate_id: wellplate.id, position_x: 30, position_y: 30) }

      it 'returns the string AD30' do
        expect(well.alphanumeric_position).to eq('AD30')
      end
    end
  end

  describe '.sortable_alphanumeric_position()' do
    context 'when position is [1,1]' do
      let(:well) { create(:well, wellplate_id: wellplate.id, position_x: 1, position_y: 1) }

      it 'returns the string A01' do
        expect(well.sortable_alphanumeric_position).to eq('A01')
      end
    end

    context 'when position is [30,30]' do
      let(:well) { create(:well, wellplate_id: wellplate.id, position_x: 30, position_y: 30) }

      it 'returns the string AD30' do
        expect(well.sortable_alphanumeric_position).to eq('AD30')
      end
    end
  end

  describe '#content?' do
    # A well straight from the column defaults: no sample, the default label and
    # the default blank readout. Both label and readouts are non-null columns,
    # so this is the case that must NOT read as occupied - otherwise a wellplate
    # could never be shrunk.
    let(:untouched) { wellplate.wells.create!(position_x: 1, position_y: 1) }

    it 'is false for an untouched well' do
      expect(untouched.content?).to be false
    end

    it 'is true when a sample is placed' do
      untouched.update!(sample: create(:sample, collections: [collection]))
      expect(untouched.content?).to be true
    end

    it 'is false when the sample was soft-deleted but the id still dangles' do
      sample = create(:sample, collections: [collection])
      untouched.update!(sample: sample)
      sample.destroy

      expect(untouched.reload.content?).to be false
    end

    it 'is false for the default label' do
      untouched.update!(label: described_class::DEFAULT_LABEL)
      expect(untouched.content?).to be false
    end

    it 'is false for readouts that are present but blank' do
      untouched.update!(readouts: [{ 'value' => '', 'unit' => '' }])
      expect(untouched.content?).to be false
    end

    {
      'a readout value' => { readouts: [{ 'value' => '42', 'unit' => '' }] },
      'a readout unit' => { readouts: [{ 'value' => '', 'unit' => 'nM' }] },
      'a user label' => { label: 'my label' },
      'a colour code' => { color_code: '#aabbcc' },
      'an additive' => { additive: 'DMSO' },
    }.each do |description, attributes|
      it "is true for #{description}" do
        untouched.update!(attributes)
        expect(untouched.content?).to be true
      end
    end

    it 'is true for symbol-keyed readouts built in memory' do
      well = wellplate.wells.new(position_x: 1, position_y: 1, readouts: [{ value: '42', unit: 'nM' }])
      expect(well.content?).to be true
    end
  end

  describe '.get_samples_in_wellplates()' do
    context 'when no sample is attached' do
      it 'empty array is returned' do
        expect(described_class.get_samples_in_wellplates(wellplate.id)).to eq([])
      end
    end

    context 'when 3 samples are attached' do
      let(:sample_one) { create(:sample, collections: [collection]) }
      let(:sample_two) { create(:sample, collections: [collection]) }
      let(:sample_three) { create(:sample, collections: [collection]) }

      let(:well_one) { create(:well, sample_id: sample_one.id, wellplate_id: wellplate.id) }
      let(:well_two) { create(:well, sample_id: sample_two.id, wellplate_id: wellplate.id) }
      let(:well_three) { create(:well, sample_id: sample_three.id, wellplate_id: wellplate.id) }

      it 'three sample ids are returned' do
        expected = [well_one, well_two, well_three].map(&:sample_id)
        expect(described_class.get_samples_in_wellplates(wellplate.id)).to match_array(expected)
      end
    end
  end
end
