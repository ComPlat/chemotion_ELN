# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/MultipleMemoizedHelpers
# rubocop:disable Rspec/IndexedLet
describe Chemotion::Sanitizer do
  subject(:sanitizer) { described_class }

  let(:svg_file1) { build(:svg, name: 'cyclo-C2H4I.cdjs.in') }
  let(:svg_file2) { build(:svg, name: 'cyclo-C2H4I.k215.in') }
  let(:svg_file3) { build(:svg, name: 'oxirane-resine.k1.in') }
  let(:svg_file4) { build(:svg, name: 'oxirane.k218.in') }
  let(:svg_file5) { build(:svg, name: 'cyclopropane.cdjs.in') }
  let(:svg_file6) { build(:svg, name: 'cyclopropane.k215.in') }

  let(:svg_file1_sanitized) { build(:svg, name: 'cyclo-C2H4I.cdjs.out') }
  let(:svg_file2_sanitized) { build(:svg, name: 'cyclo-C2H4I.k215.out') }
  let(:svg_file3_sanitized) { build(:svg, name: 'oxirane-resine.k1.out') }
  let(:svg_file4_sanitized) { build(:svg, name: 'oxirane.k218.out') }
  let(:svg_file5_sanitized) { build(:svg, name: 'cyclopropane.cdjs.out') }
  let(:svg_file6_sanitized) { build(:svg, name: 'cyclopropane.k215.out') }

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

    it 'preserves all attributes of <img> tags' do
      xml = <<~XML
        <div>
          <img src="image.png" alt="Sample Image" width="100" height="200" data-custom="customValue"/>
        </div>
      XML

      expected = <<~XML
        <div>
          <img src="image.png" alt="Sample Image" width="100" height="200" data-custom="customValue"/>
        </div>
      XML
      expect(sanitizer.scrub_xml(xml).strip).to eq(expected.strip)
    end

    it 'preserves all attributes of <img> tags with additional attributes and nested elements' do
      xml = <<~XML
        <section>
          <p>Here is an image:</p>
          <img src="photo.jpg" alt="Beautiful Landscape" width="300" height="150" class="responsive" data-info="landscape"/>
          <footer>Image provided by photographer</footer>
        </section>
      XML

      expected = <<~XML
        <section>
          <p>Here is an image:</p>
          <img src="photo.jpg" alt="Beautiful Landscape" width="300" height="150" class="responsive" data-info="landscape"/>
          <footer>Image provided by photographer</footer>
        </section>
      XML

      expect(sanitizer.scrub_xml(xml).strip).to eq(expected.strip)
    end
  end

  describe 'scrub_svg with id remap' do
    let(:svg_with_refs) { build(:svg, name: 'sample_with_refs') }
    let(:svg_with_refs_remapped) { build(:svg, name: 'sample_with_refs_remapped') }
    let(:svg_reaction) { build(:svg, name: 'impossible-reaction') }
    let(:svg_reaction_remapped) { build(:svg, name: 'impossible-reaction_remapped') }
    let(:hex4) do
      %w[
        00000000 00000001 00000002 00000003 00000004
        00000005 00000006 00000007 00000008 00000009
      ]
    end

    it 'remaps glyph ids and references in SVG files' do
      allow(SecureRandom).to receive(:hex).and_return(*hex4)
      result = sanitizer.scrub_svg(svg_with_refs, remap_glyph_ids: true)
      expect(result).to eq(svg_with_refs_remapped)
    end

    it 'remaps glyph ids and references in SVG files for reactions' do
      allow(SecureRandom).to receive(:hex).and_return(*hex4)
      result = sanitizer.scrub_svg(svg_reaction, remap_glyph_ids: true)
      expect(result).to eq(svg_reaction_remapped)
    end
  end
end
# rubocop:enable RSpec/MultipleMemoizedHelpers
# rubocop:enable Rspec/IndexedLet
