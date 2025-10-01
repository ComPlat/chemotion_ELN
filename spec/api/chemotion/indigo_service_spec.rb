# frozen_string_literal: true

require 'rails_helper'

RSpec.describe IndigoService do
  let(:molfile_structure) { 'C1=CC=CC=C1' }
  let(:output_format) { 'image/svg+xml' }
  let(:service_url) { 'http://indigo_service/' }
  let(:response_body) { '<svg></svg>' }
  let(:info_response_body) { { 'name' => 'Indigo Service', 'version' => '2.3.4', 'status' => 'ok' }.to_json }

  before do
    allow(Rails.configuration.indigo_service).to receive(:indigo_service_url).and_return(service_url)
  end

  describe '#render_structure' do
    it 'returns SVG when IndigoService responds successfully' do
      stub_request(:post, "#{service_url}v2/indigo/render")
        .with(
          body: { struct: molfile_structure, output_format: output_format }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
        .to_return(status: 200, body: response_body)

      result = described_class.new(molfile_structure, output_format).render_structure
      expect(result).to eq(response_body)
    end

    it 'returns error hash when request fails' do
      stub_request(:post, "#{service_url}v2/indigo/render")
        .to_return(status: 400, body: '')

      result = described_class.new(molfile_structure, output_format).render_structure
      expect(result).to eq({ error: 'Failed to contact Indigo service', status: 400 })
    end
  end

  describe '#service_info' do
    it 'returns raw JSON string when IndigoService responds successfully' do
      stub_request(:get, "#{service_url}v2/indigo/info")
        .with(headers: { 'Content-Type' => 'application/json' })
        .to_return(status: 200, body: info_response_body)

      result = described_class.new(molfile_structure, output_format).service_info
      expect(result).to eq(info_response_body)
    end

    it 'returns error hash when request fails' do
      stub_request(:get, "#{service_url}v2/indigo/info")
        .to_return(status: 500, body: '')

      result = described_class.new(molfile_structure, output_format).service_info
      expect(result).to eq({ error: 'Failed to contact Indigo service', status: 500 })
    end
  end

  describe 'error handling' do
    it 'returns HTTParty error message when HTTParty raises an exception' do
      allow(HTTParty).to receive(:post).and_raise(HTTParty::Error.new('network timeout'))

      result = described_class.new(molfile_structure, output_format).render_structure
      expect(result).to eq({ error: 'HTTParty error: network timeout' })
    end

    it 'returns general error message when a standard error is raised' do
      allow(HTTParty).to receive(:get).and_raise(StandardError.new('unexpected failure'))

      result = described_class.new(molfile_structure, output_format).service_info
      expect(result).to eq({ error: 'General error: unexpected failure' })
    end
  end
end
