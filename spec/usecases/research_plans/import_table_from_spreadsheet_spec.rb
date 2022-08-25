# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Usecases::ResearchPlans::ImportTableFromSpreadsheet do
  let(:file_path) { Rails.root.join('public/xlsx/wellplate_import_template.xlsx') }
  let(:file_name) { File.basename(file_path) }
  let(:attachment) do
    create(:attachment, filename: file_name, file_path: file_path)
  end
  let(:research_plan) { create(:research_plan, attachments: [attachment]) }
  let(:importer) { described_class.new(research_plan, attachment) }

  context 'when receiving wrong extension' do
    let(:attachment) { create(:attachment) }

    it 'raises an exception' do
      error_message = ["Can not process this type of file, must be '.xlsx'."].join("\n")

      expect { importer.execute! }.to raise_error(StandardError, error_message)
    end
  end

  context 'with valid data' do
    let(:header_names) {
      [
        'Position',
        'Sample',
        'External Compound Label/ID',
        'Smiles',
        'Readout1_Value',
        'Readout1_Unit',
        'Readout2_Value',
        'Readout2_Unit'
      ]
    }
    before do
      importer.execute!
      research_plan.reload
    end

    it 'imports headers' do
      actual_header_names = research_plan.body.last['value']['columns'].map { |column| column['headerName'] }
      expect(actual_header_names).to eq header_names
    end

    it 'imports row data' do
      rows = research_plan.body.last['value']['rows']
      rows.each_with_index do |row, index|
        expect(row['Position']).to eq index_to_position(index)
        expect(row['Sample']).to eq nil
        expect(row['External Compound Label/ID']).to eq nil
        expect(row['Smiles']).to eq nil
        expect(row['Readout1_Value'].to_f).to eq "0.#{index + 1}".to_f
        expect(row['Readout1_Unit']).to eq 'mg'
        expect(row['Readout2_Value']).to eq (index + 1)
        expect(row['Readout2_Unit']).to eq 'GW'
      end
    end
  end

  def index_to_position(index)
    row = ('A'..'Z').to_a[index / 12] # row is represented by a Letter
    column = (index % 12) + 1
    [row, column].join
  end
end
