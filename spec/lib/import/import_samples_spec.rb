# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Import::ImportSamples' do
  let(:user_id) { create(:user).id }
  let(:collection_id) { create(:collection).id }
  let(:file_path) { 'spec/fixtures/import/sample_import_template.xlsx' }
  let(:file_name) { File.basename(file_path) }
  let(:attachment) do
    create(:attachment, :with_sample_import_template,
           created_by: user_id,
           created_for: user_id)
  end
  let(:importer) { Import::ImportSamples.new(attachment, collection_id, user_id, attachment.filename, 'sample') }
  let(:sample) { create(:sample) }

  before do
    stub_rest_request('BYHVGQHIAFURIL-UHFFFAOYSA-N')
    stub_rest_request('PNNRZXFUPQQZSO-UHFFFAOYSA-N')
    stub_rest_request('UHOVQNZJYSORNB-UHFFFAOYSA-N')
    stub_rest_request('YMWUJEATGCHHMB-UHFFFAOYSA-N')
    stub_rest_request('QPUYECUOLPXSFR-UHFFFAOYSA-N')
    stub_rest_request('AUHZEENZYGFFBQ-UHFFFAOYSA-N')
    stub_rest_request('RYYVLZVUVIJVGH-UHFFFAOYSA-N')
    stub_rest_request('KWMALILVJYNFKE-UHFFFAOYSA-N')
  end

  describe '.format_to_interval_syntax' do
    let(:processed_row) { importer.send(:format_to_interval_syntax, unprocessed_row) }

    context 'with single integer number' do
      let(:unprocessed_row) { '1' }

      it 'returns single number' do
        expect(processed_row).to eq '[1.0, Infinity]'
      end
    end

    context 'with single float number' do
      let(:unprocessed_row) { '1.234' }

      it 'returns single number' do
        expect(processed_row).to eq '[1.234, Infinity]'
      end
    end

    context 'with range float/float number' do
      let(:unprocessed_row) { '1.234-2.345' }

      it 'returns interval' do
        expect(processed_row).to eq '[1.234, 2.345]'
      end
    end

    context 'with range float/int number' do
      let(:unprocessed_row) { '1.234-1' }

      it 'returns interval' do
        expect(processed_row).to eq '[1.234, 1.0]'
      end
    end

    context 'with invalide format' do
      let(:unprocessed_row) { '1.23.4-1' }

      it 'returns infinity interval' do
        expect(processed_row).to eq '[-Infinity, Infinity]'
      end
    end

    context 'with range float/negative int number' do
      let(:unprocessed_row) { '1.234--1' }

      it 'returns interval' do
        expect(processed_row).to eq '[1.234, -1.0]'
      end
    end
  end

  describe '.import sample' do
    let(:import_result) { importer.process }
    let(:unprocessed_row) { '1' }

    context 'with including 3 samples' do
      it 'sample import is successful' do
        expect(import_result[:status]).to eq 'ok'
      end

      it 'new molecules were imported in database' do
        import_result
        sample = Sample.find_by(name: 'Test 1')
        molecule_names = sample.molecule.molecule_names
        expect(molecule_names).to be_present
      end
    end
  end

  def stub_rest_request(identifier)
    stub_request(:get, "http://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/#{identifier}/record/JSON")
      .with(
        headers: {
          'Accept' => '*/*',
          'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
          'Content-Type' => 'text/json',
          'User-Agent' => 'Ruby',
        },
      )
      .to_return(status: 200, body: '', headers: {})
  end

  describe '#format_molarity_value' do
    it 'returns nil if value is empty' do
      expect(importer.format_molarity_value('', 'value')).to be_nil
    end

    it 'returns the value as a float if type is value' do
      expect(importer.format_molarity_value('1.5', 'value')).to eq(1.5)
    end

    it 'returns M if the value contains m/L or M' do
      expect(importer.format_molarity_value('0.5 m/L', 'unit')).to eq('M')
      expect(importer.format_molarity_value('0.5 M', 'unit')).to eq('M')
    end

    it 'returns nil if the value does not contain a valid molarity unit' do
      expect(importer.format_molarity_value('0.5', 'unit')).to be_nil
    end
  end

  describe '#to_value_unit_format' do
    context 'when db_column is density' do
      it 'extracts the numerical value and unit when value contains valid density unit' do
        result = importer.to_value_unit_format('1.25 g/ml', 'density')
        expect(result).to eq({ value: 1.25, unit: 'g/ml' })
      end

      it 'returns nil for both value and unit when value does not contain a valid unit' do
        result = importer.to_value_unit_format('1.25 kg/L', 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end

    context 'when db_column is molarity' do
      it 'extracts the numerical value and unit when value contains valid molarity unit' do
        result = importer.to_value_unit_format('0.5 M', 'molarity')
        expect(result).to eq({ value: 0.5, unit: 'M' })
      end

      it 'returns expected value and unit if molarity unit is valid' do
        result = importer.to_value_unit_format('0.7 mol/L', 'molarity')
        expect(result).to eq({ value: 0.7, unit: 'M' })
      end
    end

    context 'when db_column is flash_point' do
      it 'extracts the numerical value and unit when value contains valid flash point unit' do
        result = importer.to_value_unit_format('100 °C', 'flash_point')
        expect(result).to eq({ value: 100, unit: '°C' })
      end

      it 'returns nil for both value and unit when value does not contain a valid flash point unit' do
        result = importer.to_value_unit_format('100 Koma', 'flash_point')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end

    context 'when value is nil or empty' do
      it 'returns nil for both value and unit when value is nil' do
        result = importer.to_value_unit_format(nil, 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end

      it 'returns nil for both value and unit when value is an empty string' do
        result = importer.to_value_unit_format('', 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end

    context 'when value does not contain a numerical value' do
      it 'returns nil for both value and unit when no numerical value is found' do
        result = importer.to_value_unit_format('abc g/ml', 'density')
        expect(result).to eq({ value: nil, unit: nil })
      end
    end
  end

  describe '#handle_sample_fields' do
    it 'update sample flash point attribute with expected values' do
      importer.handle_sample_fields(sample, 'flash_point', { value: 15, unit: '°C' })
      expect(sample['xref']['flash_point']['value']).to eq(15)
      expect(sample['xref']['flash_point']['unit']).to eq('°C')
    end

    it 'update sample molarity attribute with expected values' do
      importer.handle_sample_fields(sample, 'molarity', { value: 1.24, unit: 'M' })
      expect(sample['molarity_value']).to eq(1.24)
      expect(sample['molarity_unit']).to eq('M')
    end

    it 'update sample default attribute with expected values' do
      importer.handle_sample_fields(sample, 'refractive_index', 0.85)
      expect(sample['xref']['refractive_index']).to eq(0.85)
    end

    it 'update sample density attribute with expected values' do
      importer.handle_sample_fields(sample, 'density', { value: 2.24, unit: 'g/mL' })
      expect(sample['density']).to eq(2.24)
    end
  end

  describe 'composition table' do
    describe '#parse_composition_table_data' do
      it 'does nothing when workbook has no sample_composition_table sheet' do
        importer.read_file
        allow(importer.xlsx).to receive(:sheets).and_return(['Sample'])
        importer.send(:parse_composition_table_data)
        expect(importer.composition_table_data).to eq({})
      end

      context 'when sample_composition_table sheet is present' do
        let(:comp_sheet) do
          sheet = instance_double(Roo::Excelx, 'comp_sheet')
          allow(sheet).to receive(:row).with(1).and_return(
            ['Sample UUID', 'Source', 'Weight ratio exp.', 'Molar Mass (g/mol)']
          )
          allow(sheet).to receive(:row).with(2).and_return(
            ['uuid-abc', '50% Pd', 50.0, 106.4]
          )
          allow(sheet).to receive(:row).with(3).and_return(
            ['uuid-abc', '50% support', 50.0, 200.0]
          )
          allow(sheet).to receive(:last_row).and_return(3)
          sheet
        end

        before do
          importer.read_file
          allow(importer.xlsx).to receive(:sheets).and_return(%w[sheet1 sample_composition_table])
          allow(importer.xlsx).to receive(:sheet).with('sample_composition_table').and_return(comp_sheet)
          importer.send(:parse_composition_table_data)
        end

        it 'parses rows into composition_table_data keyed by sample uuid' do
          expect(importer.composition_table_data.keys).to include('uuid-abc')
          rows = importer.composition_table_data['uuid-abc']
          expect(rows.size).to eq(2)
          expect(rows[0]).to eq(source: '50% Pd', weight_ratio_exp: 50.0, molar_mass: 106.4)
          expect(rows[1]).to eq(source: '50% support', weight_ratio_exp: 50.0, molar_mass: 200.0)
        end
      end
    end

    describe '#apply_composition_table_data' do
      let(:sample_with_uuid) { create(:valid_sample) }
      let(:sample_uuid) { 'test-composition-uuid' }
      let(:row_with_uuid) { { 'sample uuid' => sample_uuid } }
      let(:dummy_molecule) { instance_double(Molecule, id: 1) }

      before do
        importer.instance_variable_set(:@composition_table_data, {
                                         sample_uuid => [
                                           { source: '60% Pd', weight_ratio_exp: 60.0, molar_mass: 106.4 },
                                           { source: '40% support', weight_ratio_exp: 40.0, molar_mass: 200.0 },
                                         ],
                                       })
        allow(Molecule).to receive(:find_or_create_dummy).and_return(dummy_molecule)
      end

      it 'creates HierarchicalMaterial components with source, weight_ratio_exp, molar_mass' do
        importer.send(:apply_composition_table_data, sample_with_uuid, row_with_uuid)
        sample_with_uuid.reload
        hm = sample_with_uuid.components.where(name: Sample::SAMPLE_TYPE_HIERARCHICAL_MATERIAL).order(:position)
        expect(hm.count).to eq(2)
        expect(hm.first.component_properties['source']).to eq('60% Pd')
        expect(hm.first.component_properties['weight_ratio_exp']).to eq(60.0)
        expect(hm.first.component_properties['molar_mass']).to eq(106.4)
        expect(hm.second.component_properties['source']).to eq('40% support')
      end

      it 'updates sample_type to HierarchicalMaterial when not already hierarchical or mixture' do
        sample_with_uuid.update!(sample_type: 'Micromolecule')
        importer.send(:apply_composition_table_data, sample_with_uuid, row_with_uuid)
        sample_with_uuid.reload
        expect(sample_with_uuid.sample_type).to eq(Sample::SAMPLE_TYPE_HIERARCHICAL_MATERIAL)
      end

      it 'does nothing when sample uuid is blank in row' do
        importer.send(:apply_composition_table_data, sample_with_uuid, { 'sample uuid' => '' })
        sample_with_uuid.reload
        expect(sample_with_uuid.components.where(name: Sample::SAMPLE_TYPE_HIERARCHICAL_MATERIAL).count).to eq(0)
      end

      it 'does nothing when composition_table_data has no entry for sample uuid' do
        importer.instance_variable_set(:@composition_table_data, {})
        importer.send(:apply_composition_table_data, sample_with_uuid, row_with_uuid)
        sample_with_uuid.reload
        expect(sample_with_uuid.components.where(name: Sample::SAMPLE_TYPE_HIERARCHICAL_MATERIAL).count).to eq(0)
      end
    end
  end
end
