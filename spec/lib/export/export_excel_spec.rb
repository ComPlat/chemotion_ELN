# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Export::ExportExcel' do
  let(:exporter) { Export::ExportExcel.new }
  let(:sample_json) { create(:sample).as_json }

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
      sample_json['shared_sync'] = 'f'
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

    context 'when a full-detail-level shared/synced sample is exported' do
      # Drives the real HEADERS_SAMPLE_10-based computation (generate_headers_sample), not a
      # hand-forced @headers100, so this actually exercises the production allowlist.
      let(:headers) { '@headers = ["cas"]; generate_headers_sample' }

      before do
        sample_json['shared_sync'] = 't'
        sample_json['dl_s'] = 10
        sample_json['cas'] = '50-00-0'
      end

      it 'includes the cas value (regression guard: HEADERS_SAMPLE_10 must list cas)' do
        expect(formated_value).to eq ['50-00-0']
      end
    end

    context 'when a low-detail-level shared/synced sample is exported' do
      let(:headers) { '@headers = ["cas"]; generate_headers_sample' }

      before do
        sample_json['shared_sync'] = 't'
        sample_json['dl_s'] = 0
        sample_json['cas'] = '50-00-0'
      end

      it 'omits the cas value end-to-end (structure-identifying, gated behind full detail level)' do
        expect(formated_value).to eq [nil]
      end
    end
  end

  describe 'HEADERS_SAMPLE_0' do
    it 'excludes cas (structure-identifying, must not leak at low detail level)' do
      expect(Export::ExportTable::HEADERS_SAMPLE_0).not_to include('cas')
    end
  end

  describe 'HEADERS_SAMPLE_10' do
    it 'includes cas so full-detail exports of shared/synced samples still include it' do
      expect(Export::ExportTable::HEADERS_SAMPLE_10).to include('cas')
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
