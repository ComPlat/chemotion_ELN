# frozen_string_literal: true

RSpec.describe Usecases::Wellplates::TemplateCreation do
  let(:sheet) { template.workbook.worksheets[0] }
  let(:header_row) { sheet.cells[0..8].map(&:value) }
  let(:first_data_column) { sheet.rows[1..data_column_count + 1].map { |row| row.cells[0].value } }

  describe 'execute!' do
    let(:usecase) { described_class.new(wellplate) }
    let(:template) { usecase.execute! }

    context 'when wellplate has size 2x3' do
      let(:wellplate) { create(:wellplate, :with_transient_wells, height: 3, width: 2) }
      let(:data_column_count) { 6 }

      it 'xlsx file was created and has one worksheet' do
        expect(template).not_to be_nil
        expect(template.workbook.worksheets.length).to eq 1
      end

      it 'has correct header row' do
        expect(header_row).to eq ['Position', 'Sample', 'External Compound Label/ID', 'Smiles', 'Molarity (M)',
                                  'Readout1_Value', 'Readout1_Unit', 'Readout2_Value', 'Readout2_Unit']
      end

      it 'first column of data has correct labels' do
        expect(first_data_column).to eq %w[A01 A02 B01 B02 C01 C02]
      end
    end

    context 'when wellplate has size 12x8' do
      let(:wellplate) { create(:wellplate, :with_transient_wells) }
      let(:data_column_count) { 96 }

      it 'xlsx file was created and has one worksheet' do
        expect(template).not_to be_nil
        expect(template.workbook.worksheets.length).to eq 1
      end

      it 'first column of data has correct labels' do
        expect(first_data_column).to eq %w[A01 A02 A03 A04 A05 A06 A07 A08 A09 A10 A11 A12
                                           B01 B02 B03 B04 B05 B06 B07 B08 B09 B10 B11 B12
                                           C01 C02 C03 C04 C05 C06 C07 C08 C09 C10 C11 C12
                                           D01 D02 D03 D04 D05 D06 D07 D08 D09 D10 D11 D12
                                           E01 E02 E03 E04 E05 E06 E07 E08 E09 E10 E11 E12
                                           F01 F02 F03 F04 F05 F06 F07 F08 F09 F10 F11 F12
                                           G01 G02 G03 G04 G05 G06 G07 G08 G09 G10 G11 G12
                                           H01 H02 H03 H04 H05 H06 H07 H08 H09 H10 H11 H12]
      end
    end

    context 'when wellplate has size 101x1' do
      let(:wellplate) { create(:wellplate, :with_transient_wells, width: 101, height: 1) }

      it 'an error was thrown' do
        expect { usecase.execute! }.to raise_error('Wellplate width of 101 exceeds maximum allowed width of 100')
      end
    end

    context 'when wellplate has size 1x101' do
      let(:wellplate) { create(:wellplate, :with_transient_wells, width: 1, height: 101) }

      it 'an error was thrown' do
        expect { usecase.execute! }.to raise_error('Wellplate height of 101 exceeds maximum allowed height of 100')
      end
    end
  end
end
