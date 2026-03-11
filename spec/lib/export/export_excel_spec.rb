# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Export::ExportExcel' do
  let(:user) { create(:user) }
  let!(:collection) { create(:collection, user_id: user.id) }
  let(:exporter) { Export::ExportExcel.new }
  let(:sample_json) { create(:sample, collections: [collection]).as_json }

  before do
    stub_requests
  end

  describe '.filter_with_permission_and_detail_level' do
    let(:formated_value) { exporter.filter_with_permission_and_detail_level(sample_json) }
    let(:flash_point) { '{"value": 25, "unit": "°C"}' }
    let(:melting_point) { '[13.0]' }
    let(:refractive_index) { '1' }
    let(:molarity) { '2.45 M' }
    let(:headers) { '@headers =["melting pt", "flash point", "refractive index", "molarity"]' }

    before do
      sample_json['is_shared'] = 'f'
      sample_json['melting pt'] = melting_point
      sample_json['flash_point'] = flash_point
      sample_json['refractive_index'] = refractive_index
      sample_json['molarity_value'] = '2.45'
      sample_json['molarity_unit'] = 'M'
      exporter.instance_eval(headers, __FILE__, __LINE__)
    end

    context 'with integer melting point' do
      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['13.0', '25 °C', '1', '2.45 M']
      end
    end

    context 'with float sample attributes' do
      let(:melting_point) { '[13.123,)' }

      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['13.123', '25 °C', '1', '2.45 M']
      end
    end

    context 'with float melting point in a range and other sample attributes' do
      let(:melting_point) { '[1.0,100.01]' }

      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['1.0 - 100.01', '25 °C', '1', '2.45 M']
      end
    end

    context 'with flash point in Fahrenheit' do
      let(:flash_point) { '{"value": 25, "unit": "°F"}' }

      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['13.0', '25 °F', '1', '2.45 M']
      end
    end
  end

  describe '.get_image_from_svg' do
    let(:image_loading_result) { exporter.get_image_from_svg(image_path) }

    context 'when image is available' do
      let(:image_path) { Rails.root.join('spec/fixtures/images/molecule.svg') }

      it 'result hash is created' do
        expect(image_loading_result).not_to be_nil
      end

      it 'sizes of height are correct' do
        expect(image_loading_result[:height]).to be 200
      end

      it 'sizes of width are correct' do
        expect(image_loading_result[:width]).to be 200
      end

      it 'png file was created' do
        expect(File.exist?(image_loading_result[:path])).to be true
      end
    end
  end

  describe 'composition table' do
    describe '#parse_component_source' do
      it 'returns zeros and original source for nil or empty' do
        expect(exporter.send(:parse_component_source, nil)).to eq(source: nil, component: nil, weight_ratio_calc: 0.0)
        expect(exporter.send(:parse_component_source, '')).to eq(source: '', component: nil, weight_ratio_calc: 0.0)
      end

      it 'extracts leading number as weight_ratio_calc when source contains %' do
        result = exporter.send(:parse_component_source, '50% Pd/C')
        expect(result[:source]).to eq('50% Pd/C')
        expect(result[:weight_ratio_calc]).to eq(50.0)
      end

      it 'returns 0.0 for weight_ratio_calc when source has % but no leading number' do
        result = exporter.send(:parse_component_source, 'Pd/C')
        expect(result[:weight_ratio_calc]).to eq(0.0)
      end

      it 'returns 0.0 for weight_ratio_calc when source has no % (alias-style)' do
        result = exporter.send(:parse_component_source, 't_10_0-something')
        expect(result[:source]).to eq('t_10_0-something')
        expect(result[:weight_ratio_calc]).to eq(0.0)
      end
    end

    describe '#build_composition_rows' do
      it 'returns empty rows and zero totals for empty components' do
        result = exporter.send(:build_composition_rows, [])
        expect(result[:rows]).to eq([])
        expect(result[:total_molar_calc]).to eq(0.0)
        expect(result[:total_molar_exp]).to eq(0.0)
      end

      it 'builds one row and totals for a single component with % and molar_mass' do
        comps = [{ 'source' => '60% Pd', 'weight_ratio_exp' => 60.0, 'molar_mass' => 106.4 }]
        result = exporter.send(:build_composition_rows, comps)
        expect(result[:rows].size).to eq(1)
        expect(result[:rows][0][:source_alias]).to eq('60% Pd')
        expect(result[:rows][0][:weight_ratio_exp]).to eq(60.0)
        expect(result[:rows][0][:molar_mass]).to eq(106.4)
        expect(result[:rows][0]).to include(:molar_ratio_calc_percent, :molar_ratio_exp_percent)
        expect(result[:total_molar_calc]).to be_a(Float)
        expect(result[:total_molar_exp]).to be_a(Float)
      end

      it 'splits remainder among components without weight ratio when one has %' do
        comps = [
          { 'source' => '40% A', 'weight_ratio_exp' => 40.0, 'molar_mass' => 100.0 },
          { 'source' => 'B-support', 'weight_ratio_exp' => 60.0, 'molar_mass' => 50.0 },
        ]
        result = exporter.send(:build_composition_rows, comps)
        expect(result[:rows].size).to eq(2)
        # Second component has no % so gets 100 - 40 = 60 as weight_ratio_calc_processed
        expect(result[:rows].map { |r| r[:weight_ratio_calc_processed] }).to include(40.0, 60.0)
      end

      it 'sorts rows by weight_ratio_calc_processed' do
        comps = [
          { 'source' => '20% X', 'weight_ratio_exp' => 20.0, 'molar_mass' => 10.0 },
          { 'source' => '80% Y', 'weight_ratio_exp' => 80.0, 'molar_mass' => 10.0 },
        ]
        result = exporter.send(:build_composition_rows, comps)
        expect(result[:rows].map { |r| r[:weight_ratio_calc_processed] }).to eq([20.0, 80.0])
      end
    end

    describe '#generate_composition_table_components_sheet_with_samples' do
      it 'does nothing when samples is nil' do
        expect { exporter.generate_composition_table_components_sheet_with_samples('composition_table', nil) }.not_to raise_error
        xfile = exporter.instance_variable_get(:@xfile)
        expect(xfile.workbook.worksheets.map(&:name)).not_to include('composition_table')
      end

      it 'adds one row per sample when samples have no HierarchicalMaterial components' do
        samples = [
          { 'sample uuid' => 'uuid-1', 'sample name' => 'S1', 'short label' => 'S1', 'sample external label' => 'E1', 'components' => '[]' },
        ]
        exporter.generate_composition_table_components_sheet_with_samples('sample_composition_table', samples)
        xfile = exporter.instance_variable_get(:@xfile)
        sheet = xfile.workbook.sheet_by_name('sample_composition_table')
        expect(sheet).to be_present
        # Header + 1 data row
        expect(sheet.rows.size).to eq(2)
      end

      it 'adds component rows when sample has HierarchicalMaterial components' do
        samples = [
          {
            'sample uuid' => 'uuid-1',
            'sample name' => 'S1',
            'short label' => 'S1',
            'sample external label' => 'E1',
            'components' => [
              { 'name' => 'HierarchicalMaterial', 'source' => '50% Pd', 'weight_ratio_exp' => 50.0, 'molar_mass' => 106.4 },
              { 'name' => 'HierarchicalMaterial', 'source' => '50% support', 'weight_ratio_exp' => 50.0, 'molar_mass' => 200.0 },
            ].to_json,
          },
        ]
        exporter.generate_composition_table_components_sheet_with_samples('sample_composition_table', samples)
        xfile = exporter.instance_variable_get(:@xfile)
        sheet = xfile.workbook.sheet_by_name('sample_composition_table')
        expect(sheet).to be_present
        # Header + 2 component rows
        expect(sheet.rows.size).to eq(3)
      end
    end
  end
end

def stub_requests
  stub_request(:get, 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/XLYOFNOQVPJJNP-UHFFFAOYSA-1/cids/TXT')
    .with(
      headers: {
        'Accept' => '*/*',
        'Accept-Encoding' => 'gzip;q=1.0,deflate;q=0.6,identity;q=0.3',
        'Content-Type' => 'text/plain',
        'User-Agent' => 'Ruby',
      },
    )
    .to_return(status: 200, body: '', headers: {})
end
