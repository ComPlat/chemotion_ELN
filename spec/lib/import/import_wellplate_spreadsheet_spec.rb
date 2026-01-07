# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'ImportWellplateSpreadsheet' do
  let!(:attachment) { create(:attachment, file_path: file_path) }
  let!(:wellplate) { create(:wellplate, :with_wells, attachments: [attachment]) }
  let(:import) { Import::ImportWellplateSpreadsheet.new(wellplate_id: wellplate.id, attachment_id: attachment.id) }

  describe '.process' do
    context 'when receiving wrong extension' do
      let(:expected_error_messsage) { ["Can not process this type of file, must be '.xlsx'."].join("\n") }
      let(:file_path) { Rails.root.join('spec/fixtures/import/wrong.txt') }

      it 'raises an exception' do
        expect { import.process! }.to raise_error(StandardError, expected_error_messsage)
      end
    end

    context 'when headers are missing' do
      let(:expected_error_messsage) do
        list = ["'Position' must be in cell A1.", "'Sample' must be in cell B1.", "'Concentration' must be in cell E1."]
        list.join("\n")
      end
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_headers.xlsx') }

      it 'raises an exception' do
        expect { import.process! }.to raise_error(StandardError, expected_error_messsage)
      end
    end

    context 'when prefixes are missing' do
      let(:expected_error_messsage) do
        ["'_Value 'and '_Unit' prefixes don't match up.", 'Prefixes must be unique.'].join("\n")
      end
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_prefix.xlsx') }

      it 'raises an exception' do
        expect { import.process! }.to raise_error(StandardError, expected_error_messsage)
      end
    end

    context 'when wells are missing' do
      let(:expected_error_messsage) do
        ['Well A0003 is missing or at wrong position.', 'Well H0009 is missing or at wrong position.'].join("\n")
      end
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_wells.xlsx') }

      it 'raises an exception' do
        expect { import.process! }.to raise_error(StandardError, expected_error_messsage)
      end
    end

    context 'with multiple errors in file' do
      let(:expected_error_messsage) do
        list = ["'Position' must be in cell A1.", "'Smiles' must be in cell D1.", "'Concentration' must be in cell E1."]
        list.join("\n")
      end
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_multiple_errors.xlsx') }

      it 'only raises the first error' do
        expect { import.process! }.to raise_error(StandardError, expected_error_messsage)
      end
    end

    context 'with valid data' do
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_import_template.xlsx') }

      before do
        import.process!
        wellplate.reload
      end

      it 'imports headers' do
        expect(wellplate.readout_titles).to eq %w[Readout1 Readout2]
      end

      it 'imports well readouts' do # rubocop:disable RSpec/MultipleExpectations
        expected_readouts = (1..96).map do |x|
          [{ value: "0.#{x}".to_f,
             unit: 'mg' }.stringify_keys,
           { value: "#{x}.00".to_f,
             unit: 'GW' }.stringify_keys]
        end

        expect(wellplate.wells.count).to eq 96
        expect(wellplate.ordered_wells.pluck(:readouts)).to eq expected_readouts
      end
    end

    context 'with concentration values' do
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_import_template.xlsx') }

      before do
        import.process!
        wellplate.reload
      end

      it 'imports concentration values as sample purity' do
        wellplate.wells.each do |well|
          expect(well.sample.purity).to be_between(0.0, 1.0)
        end
      end
    end

    context 'when concentration column is empty' do
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_import_template.xlsx') }

      before do
        import.process!
        wellplate.reload
      end

      it 'imports wells successfully with concentration values' do
        expect(wellplate.wells.count).to eq 96
        expect(wellplate.readout_titles).to eq %w[Readout1 Readout2]
      end
    end
  end
end
