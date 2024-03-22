# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::Sanitizer do
  subject(:sanitizer) { described_class }

  let(:svg_file_1) { File.read('spec/fixtures/svg/cyclo-C2H4I.cdjs.in.svg') }
  let(:svg_file_2) { File.read('spec/fixtures/svg/cyclo-C2H4I.k215.in.svg') }
  let(:svg_file_3) { File.read('spec/fixtures/svg/oxirane-resine.k1.in.svg') }
  let(:svg_file_4) { File.read('spec/fixtures/svg/oxirane.k218.in.svg') }

  let(:svg_file_1_sanitized) { File.read('spec/fixtures/svg/cyclo-C2H4I.cdjs.out.svg') }
  let(:svg_file_2_sanitized) { File.read('spec/fixtures/svg/cyclo-C2H4I.k215.out.svg') }
  let(:svg_file_3_sanitized) { File.read('spec/fixtures/svg/oxirane-resine.k1.out.svg') }
  let(:svg_file_4_sanitized) { File.read('spec/fixtures/svg/oxirane.k218.out.svg') }

  describe 'scrub_xml' do
    let(:xml) { '<xml><script>alert("xss")</script></xml>' }

    it 'removes script tags' do
      expect(sanitizer.scrub_xml(xml)).to eq('alert("xss")')
    end

    it 'transforms rgb to hex in SVG path' do
      xml = <<~SVG
        <svg>
          <path stroke="rgb(255, 255, 255)"/>
        </svg>
      SVG
      xml_sanitized = <<~SVG
        <svg>
          <path stroke="#000000"/>
        </svg>
      SVG
      expect(sanitizer.scrub_xml(xml)).to eq(xml_sanitized)
    end

    it 'keeps SVG attributes viewBox, RadialGradient, linearGradient in camelcase' do
      xml = <<~SVG
        <svg viewBox="0 0 100 100">
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%"/>
          <radialGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%"/>
        </svg>
      SVG
      expect(sanitizer.scrub_xml(xml)).to eq(xml)
    end

    it 'processes SVG files' do
      expect(sanitizer.scrub_svg(svg_file_1)).to eq(svg_file_1_sanitized)
      # NB stroke-miterlimit as style value is removed by the sanitizer but should be kept
      expect(sanitizer.scrub_svg(svg_file_2)).to eq(svg_file_2_sanitized)
      # NB rgba() as style value is removed by the sanitizer.
      expect(sanitizer.scrub_svg(svg_file_3)).to eq(svg_file_3_sanitized)
      expect(sanitizer.scrub_svg(svg_file_4)).to eq(svg_file_4_sanitized)
    end
  end
end
