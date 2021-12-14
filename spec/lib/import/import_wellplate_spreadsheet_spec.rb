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

  # let!(:collection) { create(:collection) }
  # let!(:wellplate) { create(:wellplate, collection: collection, attachments: [attachment]) }
  let!(:wellplate) { create(:wellplate, :with_wells, attachments: [attachment]) }

  let(:import) { Import::ImportWellplateSpreadsheet.new(attachment_id) }

  context 'when handling faulty data' do
    let!(:attachment) { FactoryBot.create(:attachment) }

    it 'rejects wrong extensions' do
      expected = { status: 'invalid',
                   message: ["Can not process this type of file, must be '.xlsx'."],
                   data: [] }

      expect(import.process!).to eql expected
    end

    it 'handles missing headers' do
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_headers.xlsx') }

      expected = { status: 'invalid',
                   message: ["Can not process this type of file, must be '.xlsx'."],
                   data: [] }

      # test 1
    end

    it 'handles missing prefixes' do
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_prefix.xlsx') }

      expected = { status: 'invalid',
                   message: ["Can not process this type of file, must be '.xlsx'."],
                   data: [] }

      # test 2
    end

    it 'handles missing wells' do
      let(:file_path) { Rails.root.join('spec/fixtures/import/wellplate_missing_wells.xlsx') }

      expected = { status: 'invalid',
                   message: ["Can not process this type of file, must be '.xlsx'."],
                   data: [] }

      # test 3
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
      expected_sample_ids = (1..96).map { nil }
      expected_readouts = (1..96).map do |x|
        [{ value: "0.#{x}",
           unit: 'mg' },
         { value: "#{x}.00",
           unit: 'GW' }]
      end
      expected_readouts = (1..96).map do
        [{ "value": nil,
           "unit": nil }.stringify_keys,
         { "value": nil,
           "unit": nil }.stringify_keys]
      end

      expect(wellplate.wells.count).to eq 96
      expect(wellplate.wells.pluck(:sample_id)).to eq expected_sample_ids
      expect(wellplate.wells.pluck(:readouts)).to eq expected_readouts
    end
  end
end
