# frozen_string_literal: true

require 'rails_helper'
require 'nokogiri'

RSpec.describe Chemotion::SvgRenderer do
  describe '.parse_polymer_payload' do
    it 'prefers the full-format PolymersList block (contains template_id + size)' do # rubocop:disable RSpec/MultipleExpectations
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

      allow(described_class).to receive_messages(
        extract_r_or_a_positions_from_svg: [{ x: 5, y: 5 }, { x: 5, y: 7 }],
        find_svg_bounds: bounds,
        load_surface_template_lookup: {
          5 => { category: 'cat', icon_name: 'icon5' },
          6 => { category: 'cat', icon_name: 'icon6' },
        },
        load_template_svg_data_uri: icon_data,
      )
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

    it 'replaces <use> glyphs with image+label groups when glyph <use> nodes exist' do # rubocop:disable RSpec/MultipleExpectations
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

      allow(described_class).to receive_messages(find_svg_bounds: bounds, load_surface_template_lookup: {
                                                   5 => { category: 'cat',
                                                          icon_name: 'icon5' },
                                                   6 => { category: 'cat',
                                                          icon_name: 'icon6' },
                                                 }, load_template_svg_data_uri: icon_data)
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

      allow(described_class).to receive_messages(
        extract_r_or_a_positions_from_svg: [],
        find_svg_bounds: bounds,
        positions_from_molfile: [{ x: 5, y: 5 }],
        load_surface_template_lookup: { 5 => { category: 'cat', icon_name: 'icon5' } },
        load_template_svg_data_uri: icon_data,
      )
      allow(described_class).to receive(:expand_svg_viewbox_to_include)
      allow(described_class).to receive(:remove_r_or_a_placeholder_glyphs)

      result = described_class.inject_polymer_shapes(svg, molfile, polymer_data)
      doc = Nokogiri::XML(result)

      expect(described_class).to have_received(:remove_r_or_a_placeholder_glyphs).at_least(:once)

      images = doc.xpath('//*[local-name()="image"]')
      expect(images.size).to eq(1)

      labels = doc.xpath('//*[local-name()="tspan"]').map(&:text)
      expect(labels).to include('LabelA')
    end
  end

  describe '.load_surface_template_lookup' do
    before { described_class.instance_variable_set(:@load_surface_template_lookup, nil) }

    it 'returns nil on failure so the next call retries (not permanently cached)' do
      allow(File).to receive(:read).and_raise(Errno::ENOENT, 'no such file')

      result = described_class.load_surface_template_lookup
      expect(result).to be_nil
      # Instance variable must stay nil so ||= re-evaluates next time
      expect(described_class.instance_variable_get(:@load_surface_template_lookup)).to be_nil
    end

    it 'memoises the result on success so the file is not re-read every call' do
      fake_json = { 'cat' => [{ 'subTabs' => [{ 'shapes' => [{ 'template_id' => 7,
                                                               'iconName' => 'bead' }] }] }] }.to_json
      allow(File).to receive(:read).and_return(fake_json)

      result1 = described_class.load_surface_template_lookup
      result2 = described_class.load_surface_template_lookup

      expect(result1).to eq(result2)
      expect(File).to have_received(:read).once
    end

    it 'guard in inject_polymer_shapes treats nil template_lookup as blank → returns original svg' do
      svg = '<svg xmlns="http://www.w3.org/2000/svg"><text x="5" y="5">A</text></svg>'
      polymer_data = { polymers: [{ atom_index: 0, template_id: 1, height: 1.0, width: 1.0 }], text_by_index: {} }

      allow(described_class).to receive_messages(
        load_surface_template_lookup: nil,
        extract_r_or_a_positions_from_svg: [{ x: 5, y: 5 }],
        find_svg_bounds: { min_x: 0, max_x: 10, min_y: 0, max_y: 10, sx: 10, sy: 10 },
      )

      result = described_class.inject_polymer_shapes(svg, '', polymer_data)
      expect(result).to eq(svg)
    end

    it 'retries after a transient failure and succeeds on second call' do
      fake_json = { 'cat' => [{ 'subTabs' => [{ 'shapes' => [{ 'template_id' => 3,
                                                               'iconName' => 'bead' }] }] }] }.to_json
      call_count = 0
      allow(File).to receive(:read) do
        call_count += 1
        raise Errno::ENOENT, 'transient' if call_count == 1

        fake_json
      end

      first  = described_class.load_surface_template_lookup
      second = described_class.load_surface_template_lookup

      expect(first).to be_nil
      expect(second).to eq({ 3 => { category: 'cat', icon_name: 'bead' } })
    end
  end

  describe '.inject_polymer_shapes guards' do
    let(:svg) { '<svg xmlns="http://www.w3.org/2000/svg"><text x="5" y="5">A</text></svg>' }

    it 'returns original svg when polymers list is blank' do
      result = described_class.inject_polymer_shapes(svg, '', { polymers: [], text_by_index: {} })
      expect(result).to eq(svg)
    end

    it 'returns original svg when SVG is blank' do
      polymer_data = { polymers: [{ atom_index: 0, template_id: 1, height: 1.0, width: 1.0 }], text_by_index: {} }
      result = described_class.inject_polymer_shapes('', '', polymer_data)
      expect(result).to eq('')
    end

    it 'returns original svg when positions are blank (no R/A text, no molfile fallback)' do
      polymer_data = { polymers: [{ atom_index: 0, template_id: 1, height: 1.0, width: 1.0 }], text_by_index: {} }

      allow(described_class).to receive_messages(extract_r_or_a_positions_from_svg: [], find_svg_bounds: nil)

      result = described_class.inject_polymer_shapes(svg, '', polymer_data)
      expect(result).to eq(svg)
    end
  end

  describe '.parse_polymer_payload extra cases' do
    it 'returns empty polymers and text_by_index for molfile without PolymersList' do
      molfile = "plain molfile\nno polymer data\n$$$$"
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:polymers]).to be_empty
      expect(payload[:text_by_index]).to be_empty
    end

    it 'strips PolymersList from cleaned_struct' do
      molfile = "header\n> <PolymersList>\n0/95/1.00-1.00\n$$$$"
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:cleaned_struct]).not_to include('PolymersList')
    end

    it 'parses polymers from PolymersList block' do
      molfile = "header\n> <PolymersList>\n0/95/1.00-1.00\n$$$$"
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:polymers].first[:atom_index]).to eq(0)
      expect(payload[:polymers].first[:template_id]).to eq(95)
    end

    it 'handles indices-only PolymersList format with default template and size' do
      molfile = "header\n> <PolymersList>\n0 1 2\n$$$$"
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:polymers].size).to eq(3)
      expect(payload[:polymers]).to all(include(template_id: 1, height: 2.0, width: 2.0))
    end

    it 'parses TextNode label into text_by_index keyed by atom index' do
      molfile = <<~MOL
        header
        > <PolymersList>
        0/95/1.00-1.00
        > <TextNode>
        0#0ce7f3#t_95_0#asdads
        > </TextNode>
        $$$$
      MOL
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:text_by_index]).to eq(0 => 'asdads')
    end

    it 'strips TextNode from cleaned_struct' do
      molfile = <<~MOL
        header
        > <PolymersList>
        0/95/1.00-1.00
        > <TextNode>
        0#0ce7f3#t_95_0#asdads
        > </TextNode>
        $$$$
      MOL
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:cleaned_struct]).not_to include('TextNode')
      expect(payload[:cleaned_struct]).not_to include('asdads')
    end

    it 'parses polymers and TextNode from a real Ketcher-produced molfile (null header, R# atom)' do
      molfile = <<~MOL
        null
          Ketcher  6232611422D 1   1.00000     0.00000     0

          1  0  0  0  0  0  0  0  0  0999 V2000
            2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        M  END

        > <PolymersList>
        0/95/1.00-1.00
        > <TextNode>
        0#0ce7f3#t_95_0#asdads
        > </TextNode>
        $$$$
      MOL
      payload = described_class.parse_polymer_payload(molfile)
      expect(payload[:polymers].first).to include(atom_index: 0, template_id: 95)
      expect(payload[:text_by_index]).to eq(0 => 'asdads')
      expect(payload[:cleaned_struct]).not_to include('PolymersList', 'TextNode')
    end
  end

  describe '.finalize_svg' do
    it 'calls inject_polymer_shapes when polymer_data has polymers' do
      svg = '<svg xmlns="http://www.w3.org/2000/svg"/>'
      polymer_data = { polymers: [{ atom_index: 0, template_id: 1, height: 1.0, width: 1.0 }], text_by_index: {} }
      injected_svg = '<svg xmlns="http://www.w3.org/2000/svg"><image/></svg>'

      allow(described_class).to receive(:inject_polymer_shapes).and_return(injected_svg)
      result = described_class.finalize_svg(svg, 'molfile', polymer_data)
      expect(described_class).to have_received(:inject_polymer_shapes)
      expect(result).not_to be_nil
    end

    it 'skips injection and sanitises directly when no polymers' do
      svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="3"/></svg>'
      polymer_data = { polymers: [], text_by_index: {} }

      allow(described_class).to receive(:inject_polymer_shapes)
      result = described_class.finalize_svg(svg, 'molfile', polymer_data)
      expect(described_class).not_to have_received(:inject_polymer_shapes)
      expect(result).not_to be_nil
    end
  end
end
