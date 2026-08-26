# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::MolfilePolymerSupport do
  let(:ctab) do
    <<~CTAB
      null
        Ketcher  6232611422D 1   1.00000     0.00000     0

        1  0  0  0  0  0  0  0  0  0999 V2000
          2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
      M  END

    CTAB
  end

  describe '.polymers_list_payload' do
    it 'returns the payload of a populated block' do
      molfile = "#{ctab}> <PolymersList>\n0/95/1.00-1.00\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0/95/1.00-1.00')
    end

    it 'stops at the next SDF data header instead of swallowing it' do
      molfile = "#{ctab}> <PolymersList>\n0/95/1.00-1.00\n> <TextNode>\n0#0ce7f3#t_95_0#label\n> </TextNode>\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0/95/1.00-1.00')
    end

    it 'returns an empty string for an empty block followed by another data block' do
      molfile = "#{ctab}> <PolymersList>\n> <TextNode>\n0#0ce7f3#t_95_0#label\n> </TextNode>\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('')
    end

    it 'prefers the full-format block over a redundant indices-only one' do
      molfile = "#{ctab}> <PolymersList>\n0 1 2\n> <PolymersList>\n0/95/1.00-1.00\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0/95/1.00-1.00')
    end

    it 'falls through an empty first block to a populated later one' do
      molfile = "#{ctab}> <PolymersList>\n\n> <PolymersList>\n7/52/1.50-2.00\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('7/52/1.50-2.00')
    end

    it 'handles CRLF line endings' do
      molfile = "M  END\r\n> <PolymersList>\r\n7/52/1.50-2.00\r\n> <TextNode>\r\nx\r\n$$$$\r\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('7/52/1.50-2.00')
    end

    it 'scrubs non-UTF-8 bytes rather than raising' do
      molfile = (+"M  END\n> <PolymersList>\n\xE4 data\n$$$$\n").force_encoding('UTF-8')

      expect { described_class.polymers_list_payload(molfile) }.not_to raise_error
    end

    it 'returns an empty string when there is no block at all' do
      expect(described_class.polymers_list_payload(ctab)).to eq('')
      expect(described_class.polymers_list_payload(nil)).to eq('')
    end
  end

  describe '.has_polymer_content?' do
    it 'is true only when a block carries a payload' do
      populated = "#{ctab}> <PolymersList>\n0/95/1.00-1.00\n> <TextNode>\nx\n> </TextNode>\n$$$$\n"
      empty = "#{ctab}> <PolymersList>\n> <TextNode>\nx\n> </TextNode>\n$$$$\n"

      expect(described_class.has_polymer_content?(populated)).to be(true)
      expect(described_class.has_polymer_content?(empty)).to be(false)
    end

    it 'is false for a molfile with no PolymersList tag' do
      expect(described_class.has_polymer_content?(ctab)).to be(false)
    end
  end

  describe '.normalize_for_open_babel' do
    # MOL is positional: line 1 is the title and may be empty. Padding must only ever append,
    # never prepend -- prepending corrupts a titled molfile, and the untitled case is preserved
    # upstream by rstrip (see ImportSamples#get_data_from_molfile).
    it 'preserves an untitled molfile\'s leading empty title line' do
      untitled = "\n  Ketcher\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\nM  END"

      expect(described_class.normalize_for_open_babel(untitled))
        .to eq("\n  Ketcher\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n")
    end

    it 'does not shift a titled molfile down a line' do
      titled = "benzene\n  Mrv1234\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\nM  END"

      expect(described_class.normalize_for_open_babel(titled))
        .to eq("benzene\n  Mrv1234\n\n  1  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n")
    end

    it 'does not add a second trailing newline' do
      expect(described_class.normalize_for_open_babel("\nX\n")).to eq("\nX\n")
    end

    it 'returns a bare newline for blank input' do
      expect(described_class.normalize_for_open_babel(nil)).to eq("\n")
      expect(described_class.normalize_for_open_babel('')).to eq("\n")
    end
  end

  # ketcher-rails (2016-2024) wrote "> <PolymersList>" *inside* the CTAB, ahead of "M  END".
  # ~130 such samples are still stored; these fixtures are reduced from real ones.
  describe 'legacy in-CTAB PolymersList blocks' do
    let(:legacy_ctab_head) do
      <<~HEAD
        #{' '}
          Ketcher 09231611312D 1   1.00000     0.00000     0

          3  2  0     0  0            999 V2000
            9.5920   -3.1000    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
           10.4580   -2.6000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
        M  RGP  1   1   1
      HEAD
    end

    it 'does not swallow the end-of-CTAB marker into the payload (sample 13207 shape)' do
      molfile = "#{legacy_ctab_head}> <PolymersList>\n0\nM  END\n\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0')
    end

    it 'keeps every index of a multi-index legacy block (sample 13210 shape)' do
      molfile = "#{legacy_ctab_head}> <PolymersList>\n0 10 12\nM  END\n\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0 10 12')
    end

    it 'reports no polymer content for an empty in-CTAB block' do
      # Before "M  END" terminated a data block this yielded the payload "M  END", which is
      # present? -- so an ordinary molecule was misreported as a polymer.
      molfile = "#{legacy_ctab_head}> <PolymersList>\nM  END\n\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('')
      expect(described_class.has_polymer_content?(molfile)).to be(false)
    end

    it 'prefers the post-M-END full-format block over legacy in-CTAB ones (sample 440603 shape)' do
      molfile = "#{legacy_ctab_head}> <PolymersList>\n0\n> <PolymersList>\n0\n" \
                "M  END\n\n> <PolymersList>\n0/95/1.00-1.00\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0/95/1.00-1.00')
      expect(described_class.has_polymer_content?(molfile)).to be(true)
    end

    it 'tolerates non-canonical spacing in the end-of-CTAB marker' do
      molfile = "#{legacy_ctab_head}> <PolymersList>\n0\nM END\n\n$$$$\n"

      expect(described_class.polymers_list_payload(molfile)).to eq('0')
    end
  end
end
