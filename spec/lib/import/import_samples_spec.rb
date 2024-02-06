# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Import::ImportSamples' do
  let(:user_id) { create(:user).id }
  let(:collection_id) { create(:collection).id }
  let(:file_path) { 'spec/fixtures/import/sample_import_template.xlsx' }
  let(:file_name) { File.basename(file_path) }
  let(:importer) { Import::ImportSamples.new(file_path, collection_id, user_id, file_name, 'sample') }

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
end
