# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ImportWellplateSpreadsheet' do
  let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_import_template.xlsx') }
  let(:file_data) { File.read(file_path) }
  let(:file_name) { File.basename(file_path) }
  let!(:attachment) do
    FactoryBot.create(:attachment, filename: file_name, file_path: file_path, file_data: file_data)
  end

  let(:attachment_id) { attachment.id }

  let!(:wellplate) { create(:wellplate, :with_wells, attachments: [attachment]) }

  let(:import) { Import::ImportWellplateSpreadsheet.new(attachment_id) }

  context 'when receiving wrong extension' do
    let!(:attachment) { FactoryBot.create(:attachment) }

    it 'rejects wrong extensions' do
      expected = { status: 'invalid',
                   message: ["Can not process this type of file, must be '.xlsx'."],
                   data: [] }

      expect(import.process!).to eql expected
    end
  end

  context 'when headers are missing' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_headers.xlsx') }

    it 'handles missing headers' do
      expected = { status: 'invalid',
                   message: ['Position should be in cell A1.',
                             'sample_ID should be in cell B1.'],
                   data: [] }

      expect(import.process!).to eql expected
    end
  end

  context 'when headers are missing' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_prefix.xlsx') }

    it 'handles missing prefixes' do
      expected = { status: 'invalid',
                   message: ["'_Value 'and '_Unit' prefixes don't match up.",
                             'Prefixes must be unique.'],
                   data: [] }

      expect(import.process!).to eql expected
    end
  end

  context 'when wells are missing' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_wells.xlsx') }

    it 'handles missing wells' do
      expected = { status: 'invalid',
                   message: ['Well A3 is missing or at wrong position.',
                             'Well H9 is missing or at wrong position.'],
                   data: [] }

      expect(import.process!).to eql expected
    end
  end

  context 'with valid data' do
    before do
      import.process!
      wellplate.reload
    end

    it 'imports headers' do
      expect(wellplate.readout_titles).to eq %w[Readout1 Readout2]
    end

    it 'imports well readouts' do
      expected_sample_ids = (1..96).map { |x| x + 10_000 }
      expected_readouts = (1..96).map do |x|
        [{ value: "0.#{x}".to_f,
           unit: 'mg' }.stringify_keys,
         { value: "#{x}.00".to_f,
           unit: 'GW' }.stringify_keys]
      end

      expect(wellplate.wells.count).to eq 96
      expect(wellplate.wells.pluck(:sample_id)).to eq expected_sample_ids
      expect(wellplate.wells.pluck(:readouts)).to eq expected_readouts
    end
  end
end
