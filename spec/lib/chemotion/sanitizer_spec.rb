'spec/fixtures/svg/cyclo-C2H4I.cdjs.out.svg'# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::Sanitizer do
  subject(:sanitizer) { described_class }

  let(:svg_file1) { File.read('spec/fixtures/svg/cyclo-C2H4I.cdjs.in.svg') }
  let(:svg_file2) { File.read('spec/fixtures/svg/cyclo-C2H4I.k215.in.svg') }
  let(:svg_file3) { File.read('spec/fixtures/svg/oxirane-resine.k1.in.svg') }
  let(:svg_file4) { File.read('spec/fixtures/svg/oxirane.k218.in.svg') }
  let(:svg_file5) { File.read('spec/fixtures/svg/cyclopropane.cdjs.in.svg') }
  let(:svg_file6) { File.read('spec/fixtures/svg/cyclopropane.k215.in.svg') }

  let(:svg_file1_sanitized) { File.read('spec/fixtures/svg/cyclo-C2H4I.cdjs.out.svg') }
  let(:svg_file2_sanitized) { File.read('spec/fixtures/svg/cyclo-C2H4I.k215.out.svg') }
  let(:svg_file3_sanitized) { File.read('spec/fixtures/svg/oxirane-resine.k1.out.svg') }
  let(:svg_file4_sanitized) { File.read('spec/fixtures/svg/oxirane.k218.out.svg') }
  let(:svg_file5_sanitized) { File.read('spec/fixtures/svg/cyclopropane.cdjs.out.svg') }
  let(:svg_file6_sanitized) { File.read('spec/fixtures/svg/cyclopropane.k215.out.svg') }

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

    it 'processes SVG files from cdjs' do
      expect(sanitizer.scrub_svg(svg_file1)).to eq(svg_file1_sanitized)
    end

    it 'processes SVG files from ketch 2.15' do
      # NB stroke-miterlimit as style value is removed by the sanitizer but should be kept
      expect(sanitizer.scrub_svg(svg_file2)).to eq(svg_file2_sanitized)
    end

    it 'processes SVG files ketch 1 with resine' do
      # NB rgba() as style value is removed by the sanitizer.
      expect(sanitizer.scrub_svg(svg_file3)).to eq(svg_file3_sanitized)
    end

    it 'processes SVG files from ketch 2.18' do
      expect(sanitizer.scrub_svg(svg_file4)).to eq(svg_file4_sanitized)
    end

    it 'processes SVG files cdjs 2' do
      expect(sanitizer.scrub_svg(svg_file5)).to eq(svg_file5_sanitized)
    end

    it 'processes SVG files ketch 2.15 2' do
      expect(sanitizer.scrub_svg(svg_file6)).to eq(svg_file6_sanitized)
    end
  end
end
