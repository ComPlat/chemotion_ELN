# frozen_string_literal: true

require 'rails_helper'

describe Reporter::Img::Conv do
  describe '.by_inkscape' do
    let(:input)  { '/tmp/input.svg' }
    let(:output) { '/tmp/output.png' }
    let(:ext)    { 'png' }

    before do
      # pin_nested_svg_height returns [path, nil] when the SVG needs no change
      allow(described_class).to receive(:pin_nested_svg_height).and_return([input, nil])
    end

    context 'when Inkscape 1.x is available' do
      before { allow(described_class).to receive(:system).and_return(true) }

      it 'uses --export-area-page to preserve declared SVG page dimensions' do
        expect(described_class).to receive(:system) do |cmd, *args|
          expect(cmd).to eq('inkscape')
          expect(args).to include('--export-area-page')
          expect(args).not_to include('--export-area-drawing')
          true
        end

        described_class.by_inkscape(input, output, ext)
      end

      it 'passes the default width and height to the 1.x call' do
        expect(described_class).to receive(:system) do |cmd, *args|
          expect(args).to include('--export-width=1550')
          expect(args).to include('--export-height=440')
          true
        end

        described_class.by_inkscape(input, output, ext)
      end

      it 'accepts custom width and height keyword arguments' do
        expect(described_class).to receive(:system) do |cmd, *args|
          expect(args).to include('--export-width=2000')
          expect(args).to include('--export-height=600')
          true
        end

        described_class.by_inkscape(input, output, ext, width: 2000, height: 600)
      end

      it 'prepares the SVG via pin_nested_svg_height before export' do
        expect(described_class).to receive(:pin_nested_svg_height).with(input).and_return([input, nil])
        allow(described_class).to receive(:system).and_return(true)
        described_class.by_inkscape(input, output, ext)
      end

      it 'passes only Strings to the system call (regression: Pathname input must not raise TypeError)' do
        expect(described_class).to receive(:system) do |cmd, *args|
          expect(args).to all(be_a(String))
          true
        end

        described_class.by_inkscape(Pathname.new(input), output, ext)
      end
    end

    context 'when input is a Pathname' do
      before { allow(described_class).to receive(:system).and_return(true) }

      it 'does not raise TypeError' do
        expect { described_class.by_inkscape(Pathname.new(input), output, ext) }.not_to raise_error
      end

      it 'converts the Pathname to a String before calling pin_nested_svg_height' do
        expect(described_class).to receive(:pin_nested_svg_height).with(input).and_return([input, nil])
        described_class.by_inkscape(Pathname.new(input), output, ext)
      end
    end

    context 'when Inkscape 1.x call fails (falls back to 0.x syntax)' do
      before do
        call_count = 0
        allow(described_class).to receive(:system) do |*_args|
          call_count += 1
          call_count == 1 ? nil : true
        end
      end

      it 'does not raise when the 0.x fallback succeeds' do
        expect { described_class.by_inkscape(input, output, ext) }.not_to raise_error
      end

      it 'raises when both calls fail' do
        allow(described_class).to receive(:system).and_return(nil)
        expect { described_class.by_inkscape(input, output, ext) }
          .to raise_error(RuntimeError, 'Inkscape export failed')
      end
    end

    context 'when pin_nested_svg_height returns a patched Tempfile' do
      let(:patched_path) { '/tmp/patched.svg' }
      let(:patched_tmp)  { instance_double(Tempfile) }

      before do
        allow(described_class).to receive(:pin_nested_svg_height).and_return([patched_path, patched_tmp])
        allow(described_class).to receive(:system).and_return(true)
        allow(patched_tmp).to receive(:close!)
      end

      it 'closes the patched Tempfile after export' do
        expect(patched_tmp).to receive(:close!)
        described_class.by_inkscape(input, output, ext)
      end

      it 'closes the patched Tempfile even when export raises' do
        allow(described_class).to receive(:system).and_return(nil)
        expect(patched_tmp).to receive(:close!)
        expect { described_class.by_inkscape(input, output, ext) }.to raise_error('Inkscape export failed')
      end
    end
  end

  describe '.pin_nested_svg_height' do
    def write_svg(content)
      f = Tempfile.new(['conv_spec', '.svg'])
      f.write(content)
      f.flush
      f.path
    end

    context 'when the SVG has an inner <svg width="100%"> without height' do
      let(:svg) do
        <<~SVG
          <svg xmlns="http://www.w3.org/2000/svg" width="1560" height="440">
            <rect width="1560" height="440" fill="none"/>
            <svg width="100%" viewBox="0 0 800 600">
              <circle cx="50" cy="50" r="40"/>
            </svg>
          </svg>
        SVG
      end

      it 'returns a new path (not the original)' do
        path = write_svg(svg)
        result_path, = described_class.pin_nested_svg_height(path)
        expect(result_path).not_to eq(path)
      end

      it 'returns a Tempfile as the second element' do
        path = write_svg(svg)
        _, result_tmp = described_class.pin_nested_svg_height(path)
        expect(result_tmp).to be_a(Tempfile)
        result_tmp.close!
      end

      it 'adds height="100%" to the inner svg element' do
        path = write_svg(svg)
        result_path, result_tmp = described_class.pin_nested_svg_height(path)
        doc = Nokogiri::XML(File.read(result_path))
        inner = doc.xpath('//*[local-name()="svg"]/*[local-name()="svg"]').first
        expect(inner['height']).to eq('100%')
        expect(inner['width']).to eq('100%')
        result_tmp.close!
      end
    end

    context 'when the inner <svg> already has an explicit height' do
      let(:svg) do
        <<~SVG
          <svg xmlns="http://www.w3.org/2000/svg" width="1560" height="440">
            <svg width="100%" height="440" viewBox="0 0 800 600"/>
          </svg>
        SVG
      end

      it 'returns the original path unchanged' do
        path = write_svg(svg)
        result_path, result_tmp = described_class.pin_nested_svg_height(path)
        expect(result_path).to eq(path)
        expect(result_tmp).to be_nil
      end
    end

    context 'when the SVG has no nested svg elements' do
      let(:svg) do
        <<~SVG
          <svg xmlns="http://www.w3.org/2000/svg" width="1560" height="440">
            <circle cx="50" cy="50" r="40"/>
          </svg>
        SVG
      end

      it 'returns the original path unchanged' do
        path = write_svg(svg)
        result_path, result_tmp = described_class.pin_nested_svg_height(path)
        expect(result_path).to eq(path)
        expect(result_tmp).to be_nil
      end
    end

    context 'when the SVG contains polymer <image> elements inside the nested svg' do
      let(:svg) do
        <<~SVG
          <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
               width="1560" height="440">
            <rect width="1560" height="440" fill="none"/>
            <svg width="100%" viewBox="0 0 1000 800">
              <g transform="translate(100, 50)">
                <path d="M0 0 L100 0"/>
                <image x="10" y="10" width="80" height="80"
                       xlink:href="data:image/png;base64,ABC123"/>
              </g>
            </svg>
          </svg>
        SVG
      end

      it 'adds height="100%" so polymer images are scaled within the frame, not clipped' do
        path = write_svg(svg)
        result_path, result_tmp = described_class.pin_nested_svg_height(path)
        doc = Nokogiri::XML(File.read(result_path))
        inner = doc.xpath('//*[local-name()="svg"]/*[local-name()="svg"]').first
        expect(inner['height']).to eq('100%')
        result_tmp.close!
      end

      it 'preserves <image> elements in the output' do
        path = write_svg(svg)
        result_path, result_tmp = described_class.pin_nested_svg_height(path)
        doc = Nokogiri::XML(File.read(result_path))
        images = doc.xpath('//*[local-name()="image"]')
        expect(images).not_to be_empty
        result_tmp.close!
      end
    end
  end

  describe '.data_to_svg' do
    it 'writes SVG data to a temp file and returns a Tempfile' do
      svg = '<svg><circle/></svg>'
      svg_tmp = described_class.data_to_svg(svg)
      expect(svg_tmp).to be_a(Tempfile)
      expect(File.read(svg_tmp.path)).to eq(svg)
    ensure
      svg_tmp&.close!
    end
  end

  describe '.valid?' do
    it 'returns true for a non-empty file' do
      Tempfile.open('conv_valid') do |f|
        f.write('data')
        f.flush
        expect(described_class.valid?(f.path)).to be true
      end
    end

    it 'returns false for an empty file' do
      Tempfile.open('conv_empty') do |f|
        expect(described_class.valid?(f.path)).to be false
      end
    end
  end
end
