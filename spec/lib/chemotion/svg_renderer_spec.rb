# frozen_string_literal: true

require 'rails_helper'
require 'nokogiri'

RSpec.describe Chemotion::SvgRenderer do
  describe '.parse_polymer_payload' do
    it 'prefers the full-format PolymersList block (contains template_id + size)' do
      molfile = <<~MOL
        molfile header
        2 0 0 0 0 0 0 0 0 0 0 0 V2000
        0.0 0.0 0.0 C 0 0 0 0 0 0 0 0
        1.0 2.0 0.0 C 0 0 0 0 0 0 0 0
        > <PolymersList>
        0 1
        > <PolymersList>
        0/5/2.0-2.0 1/6/3.0-3.0
        > <TextNode>
        0#k#a#LabelA
        1#k#a#LabelB
        > </TextNode>
        $$$$
      MOL

      payload = described_class.parse_polymer_payload(molfile)

      expect(payload[:polymers].size).to eq(2)
      expect(payload[:polymers].map { |p| p[:template_id] }).to eq([5, 6])
      expect(payload[:polymers].map { |p| p[:width] }).to eq([2.0, 3.0])
      expect(payload[:text_by_index]).to include(0 => 'LabelA', 1 => 'LabelB')
    end
  end

  describe '.inject_polymer_shapes' do
    let(:bounds) { { min_x: 0, max_x: 10, min_y: 0, max_y: 10, sx: 10, sy: 10 } }
    let(:icon_data) { 'data:image/svg+xml;base64,ZmFrZQ==' }

    it 'injects polymer images and labels when SVG exposes R#/A text positions' do
      svg = <<~SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
          <text x="5" y="5">R 1</text>
          <text x="5" y="7">R 2</text>
        </svg>
      SVG

      molfile = '' # sorting falls back to atom_index when molfile doesn't contain V2000

      polymer_data = {
        polymers: [
          { atom_index: 0, template_id: 5, height: 2.0, width: 2.0 },
          { atom_index: 1, template_id: 6, height: 2.0, width: 2.0 },
        ],
        text_by_index: { 0 => 'LabelA', 1 => 'LabelB' },
      }

      allow(described_class).to receive(:extract_r_or_a_positions_from_svg).and_return([{ x: 5, y: 5 }, { x: 5, y: 7 }])
      allow(described_class).to receive(:find_svg_bounds).and_return(bounds)
      allow(described_class).to receive(:load_surface_template_lookup).and_return({
        5 => { category: 'cat', icon_name: 'icon5' },
        6 => { category: 'cat', icon_name: 'icon6' },
      })
      allow(described_class).to receive(:load_template_svg_data_uri).and_return(icon_data)
      allow(described_class).to receive(:expand_svg_viewbox_to_include)

      result = described_class.inject_polymer_shapes(svg, molfile, polymer_data)
      doc = Nokogiri::XML(result)

      images = doc.xpath('//*[local-name()="image"]')
      expect(images.size).to eq(2)

      labels = doc.xpath('//*[local-name()="tspan"]').map(&:text)
      expect(labels).to include('LabelA', 'LabelB')

      # For n=2 and has_labels=true:
      # compute_polymer_scale_factors -> scale_x = bounds.sx/1.25*0.8 = 6.4
      # inject_polymer_shapes -> scale = scale_x*9 = 57.6
      # width = polymer.width*scale = 2.0*57.6 = 115.2
      expect(images.first['width'].to_f).to be_within(0.001).of(115.2)
    end

    it 'replaces <use> glyphs with image+label groups when glyph <use> nodes exist' do
      svg = <<~SVG
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="10" height="10" viewBox="0 0 10 10">
          <defs>
            <g id="glyph-0-0"><circle cx="0" cy="0" r="1"/></g>
          </defs>
          <use x="3" y="4" xlink:href="#glyph-0-0" href="#glyph-0-0"/>
          <use x="3" y="6" xlink:href="#glyph-0-0" href="#glyph-0-0"/>
        </svg>
      SVG

      molfile = ''
      polymer_data = {
        polymers: [
          { atom_index: 0, template_id: 5, height: 2.0, width: 2.0 },
          { atom_index: 1, template_id: 6, height: 2.0, width: 2.0 },
        ],
        text_by_index: { 0 => 'LabelA', 1 => 'LabelB' },
      }

      allow(described_class).to receive(:find_svg_bounds).and_return(bounds)
      allow(described_class).to receive(:load_surface_template_lookup).and_return({
        5 => { category: 'cat', icon_name: 'icon5' },
        6 => { category: 'cat', icon_name: 'icon6' },
      })
      allow(described_class).to receive(:load_template_svg_data_uri).and_return(icon_data)
      allow(described_class).to receive(:expand_svg_viewbox_to_include)

      result = described_class.inject_polymer_shapes(svg, molfile, polymer_data)
      doc = Nokogiri::XML(result)

      # Glyph should be removed once all referencing <use> elements were replaced.
      expect(doc.at_xpath('//*[local-name()="g" and @id="glyph-0-0"]')).to be_nil

      images = doc.xpath('//*[local-name()="image"]')
      expect(images.size).to eq(2)

      labels = doc.xpath('//*[local-name()="tspan"]').map(&:text)
      expect(labels).to include('LabelA', 'LabelB')

      # For n=2 and has_labels=true:
      # compute -> scale_x = 6.4, replace_r_glyph... uses scale_x*0.84 => 5.376
      # width = 2.0*5.376 = 10.752
      expect(images.first['width'].to_f).to be_within(0.001).of(10.752)
    end

    it 'falls back to molfile-provided positions when SVG has no R#/A text' do
      svg = <<~SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10">
          <g id="some-other-content"/>
        </svg>
      SVG

      molfile = 'molfile-without-r-a-text'
      polymer_data = {
        polymers: [{ atom_index: 0, template_id: 5, height: 2.0, width: 2.0 }],
        text_by_index: { 0 => 'LabelA' },
      }

      allow(described_class).to receive(:extract_r_or_a_positions_from_svg).and_return([])
      allow(described_class).to receive(:find_svg_bounds).and_return(bounds)
      allow(described_class).to receive(:positions_from_molfile).and_return([{ x: 5, y: 5 }])
      allow(described_class).to receive(:load_surface_template_lookup).and_return({
        5 => { category: 'cat', icon_name: 'icon5' },
      })
      allow(described_class).to receive(:load_template_svg_data_uri).and_return(icon_data)
      allow(described_class).to receive(:expand_svg_viewbox_to_include)
      expect(described_class).to receive(:remove_r_or_a_placeholder_glyphs).at_least(:once)

      result = described_class.inject_polymer_shapes(svg, molfile, polymer_data)
      doc = Nokogiri::XML(result)

      images = doc.xpath('//*[local-name()="image"]')
      expect(images.size).to eq(1)

      labels = doc.xpath('//*[local-name()="tspan"]').map(&:text)
      expect(labels).to include('LabelA')
    end
  end
end

