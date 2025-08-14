# frozen_string_literal: true

require 'rails_helper'

RSpec.describe IndigoService do
  let(:molfile_structure) { 'C1=CC=CC=C1' }
  let(:output_format) { 'image/svg+xml' }
  let(:service_url) { 'http://indigo_service/' }
  let(:valid_svg) { '<svg viewBox="0 0 300 300"></svg>' }
  let(:invalid_svg) { '<html></html>' }
  let(:info_response_body) { { 'name' => 'Indigo Service', 'version' => '2.3.4', 'status' => 'ok' }.to_json }

  before do
    allow(Rails.configuration.indigo_service).to receive(:indigo_service_url).and_return(service_url)
  end

  describe '#render_structure' do
    context 'when Indigo service returns valid SVG' do
      it 'returns the SVG body' do
        stub_request(:post, "#{service_url}v2/indigo/render")
          .to_return(status: 200, body: valid_svg)

        result = described_class.new(molfile_structure).render_structure
        expect(result).to eq(valid_svg)
      end
    end

    context 'when Indigo service returns invalid SVG' do
      it 'returns nil' do
        stub_request(:post, "#{service_url}v2/indigo/render")
          .to_return(status: 200, body: invalid_svg)

        result = described_class.new(molfile_structure).render_structure
        expect(result).to be_nil
      end
    end

    context 'when Indigo service returns error response' do
      it 'returns nil' do
        stub_request(:post, "#{service_url}v2/indigo/render")
          .to_return(status: 500, body: '')

        result = described_class.new(molfile_structure).render_structure
        expect(result).to be_nil
      end
    end
  end

  describe '#service_info' do
    context 'when Indigo service responds successfully' do
      it 'returns the response body' do
        stub_request(:get, "#{service_url}v2/indigo/info")
          .to_return(status: 200, body: info_response_body, headers: { 'Content-Type' => 'application/json' })

        result = described_class.new(nil).service_info
        expect(result).to eq(info_response_body)
      end
    end

    context 'when Indigo service fails to respond' do
      it 'returns nil' do
        stub_request(:get, "#{service_url}v2/indigo/info")
          .to_return(status: 503, body: '')

        result = described_class.new(nil).service_info
        expect(result).to be_nil
      end
    end
  end

  describe '#valid_indigo_svg?' do
    let(:service) { described_class.new(nil) }

    it 'returns true for valid SVG' do
      expect(service.valid_indigo_svg?(valid_svg)).to be true
    end

    it 'returns false for non-SVG content' do
      expect(service.valid_indigo_svg?(invalid_svg)).to be false
    end

    it 'returns false if viewBox is 0 0 0 0' do
      svg = '<svg viewBox="0 0 0 0"></svg>'
      expect(service.valid_indigo_svg?(svg)).to be false
    end

    it 'returns false if SVG has syntax errors' do
      bad_svg = '<svg><bad></svg>'
      expect(service.valid_indigo_svg?(bad_svg)).to be false
    end
  end
end
