# frozen_string_literal: true

require 'rails_helper'

RSpec.describe IndigoService do
  let(:molfile_structure) { 'C1=CC=CC=C1' }
  let(:output_format) { 'image/svg+xml' }
  let(:service_url) { 'http://indigo_service/' }
  let(:valid_svg) { '<svg viewBox="0 0 300 300"></svg>' }
  let(:invalid_svg) { '<html></html>' }
  let(:info_response_hash) { { 'Indigo' => { 'version' => 'any-version-string-you-like' } } }
  let(:info_response_body) { info_response_hash.to_json }

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
      it 'returns parsed JSON with Indigo version info' do
        stub_request(:get, "#{service_url}v2/indigo/info")
          .to_return(status: 200, body: info_response_body, headers: { 'Content-Type' => 'application/json' })

        result = described_class.new(nil).service_info

        expect(result).to have_key('Indigo')
        expect(result['Indigo']).to have_key('version')
        expect(result['Indigo']['version']).not_to be_empty
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

  describe '#convert_to_v2000' do
    let(:v3000_molfile) do
      <<~MOL
        benzene
          Ketcher 11202611232D

          0  0  0     0  0            999 V3000
        M  V30 BEGIN CTAB
        M  V30 COUNTS 6 6 0 0 0
        M  V30 BEGIN ATOM
        M  V30 1 C 1.3350 0.7700 0.0000 0
        M  V30 2 C 1.3350 -0.7700 0.0000 0
        M  V30 3 C 0.0000 -1.5400 0.0000 0
        M  V30 4 C -1.3350 -0.7700 0.0000 0
        M  V30 5 C -1.3350 0.7700 0.0000 0
        M  V30 6 C 0.0000 1.5400 0.0000 0
        M  V30 END ATOM
        M  V30 BEGIN BOND
        M  V30 1 1 1 2
        M  V30 2 2 2 3
        M  V30 3 1 3 4
        M  V30 4 2 4 5
        M  V30 5 1 5 6
        M  V30 6 2 6 1
        M  V30 END BOND
        M  V30 END CTAB
        M  END
      MOL
    end

    context 'when Indigo convert succeeds' do
      it 'returns a V2000 molfile string' do
        stub_request(:post, "#{service_url}v2/indigo/render").to_return(status: 200, body: valid_svg)
        stub_request(:post, "#{service_url}v2/indigo/convert")
          .to_return(status: 200, body: { struct: "V2000 molfile\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n" }.to_json,
                     headers: { 'Content-Type' => 'application/json' })

        result = described_class.new(v3000_molfile).convert_to_v2000
        expect(result).to include('V2000')
      end
    end

    context 'when Indigo convert fails' do
      it 'returns nil' do
        stub_request(:post, "#{service_url}v2/indigo/render").to_return(status: 200, body: valid_svg)
        stub_request(:post, "#{service_url}v2/indigo/convert")
          .to_return(status: 400, body: '{"error":"bad struct"}')

        result = described_class.new(v3000_molfile).convert_to_v2000
        expect(result).to be_nil
      end
    end
  end

  describe '#pixel_scale_coords?' do
    let(:service) { described_class.new(nil) }

    it 'returns true for V2000 with pixel-scale coords' do
      mol = "header\n\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\n" \
            "   100.0000  200.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\nM  END\n"
      expect(service.send(:pixel_scale_coords?, mol)).to be true
    end

    it 'returns true for V3000 with pixel-scale coords' do
      mol = "header\n\n\n  0  0  0     0  0            999 V3000\n" \
            "M  V30 BEGIN CTAB\nM  V30 COUNTS 1 0 0 0 0\nM  V30 BEGIN ATOM\n" \
            "M  V30 1 C 100.0000 200.0000 0.0000 0\nM  V30 END ATOM\nM  V30 END CTAB\nM  END\n"
      expect(service.send(:pixel_scale_coords?, mol)).to be true
    end

    it 'returns false for normal Å-scale coords' do
      mol = "header\n\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\n" \
            "     1.3350    0.7700    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0\nM  END\n"
      expect(service.send(:pixel_scale_coords?, mol)).to be false
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
