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

    before do
      sample_json['shared_sync'] = 'f'
      sample_json['melting pt'] = melting_point
      exporter.instance_eval('@headers =["melting pt"]', __FILE__, __LINE__)
    end

    context 'with integer melting point' do
      let(:melting_point) { '[13.0,]' }

      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['13.0']
      end
    end

    context 'with float melting point' do
      let(:melting_point) { '[13.123,)' }

      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['13.123']
      end
    end

    context 'with integer/float range melting point' do
      let(:melting_point) { '[1.0,100.01]' }

      it 'db range string formatted correctly' do
        expect(formated_value).to eq ['1.0 - 100.01']
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
