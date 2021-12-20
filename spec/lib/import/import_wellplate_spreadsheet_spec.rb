# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ImportWellplateSpreadsheet' do
  let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_import_template.xlsx') }
  let(:file_data) { File.read(file_path) }
  let(:file_name) { File.basename(file_path) }
  let!(:attachment) do
    FactoryBot.create(:attachment, filename: file_name, file_path: file_path, file_data: file_data)
  end
  let!(:wellplate) { create(:wellplate, :with_wells, attachments: [attachment]) }

  let(:att_id) { attachment.id }
  let(:wp_id) { wellplate.id }

  let(:import) { Import::ImportWellplateSpreadsheet.new(wellplate_id: wp_id, attachment_id: att_id) }

  context 'when receiving wrong extension' do
    let!(:attachment) { FactoryBot.create(:attachment) }

    it 'raises an exception' do
      error_message = ["Can not process this type of file, must be '.xlsx'."].join("\n")

      expect { import.process! }.to raise_error(StandardError, error_message)
    end
  end

  context 'when headers are missing' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_headers.xlsx') }

    it 'raises an exception' do
      error_message = ["'Position' must be in cell A1.", "'sample_ID' must be in cell B1."].join("\n")

      expect { import.process! }.to raise_error(StandardError, error_message)
    end
  end

  context 'when headers are missing' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_prefix.xlsx') }

    it 'raises an exception' do
      error_message = ["'_Value 'and '_Unit' prefixes don't match up.", 'Prefixes must be unique.'].join("\n")

      expect { import.process! }.to raise_error(StandardError, error_message)
    end
  end

  context 'when wells are missing' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_wells.xlsx') }

    it 'raises an exception' do
      error_message = ['Well A3 is missing or at wrong position.', 'Well H9 is missing or at wrong position.'].join("\n")

      expect { import.process! }.to raise_error(StandardError, error_message)
    end
  end

  context 'with multiple errors in file' do
    let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_multiple_errors.xlsx') }

    it 'only raises the first error' do
      error_message = ["'Position' must be in cell A1.", "'Smiles' must be in cell D1."].join("\n")

      expect { import.process! }.to raise_error(StandardError, error_message)
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
