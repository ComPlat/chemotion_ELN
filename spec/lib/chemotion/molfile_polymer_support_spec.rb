# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::MolfilePolymerSupport do
  # Three polymer molfiles: (1) 3 R# with bonds, (2) 3 R# no bonds, (3) 1 R#
  let(:molfile_three_r_with_bonds) do
    <<~MOL
      null
        Ketcher  3162612562D 1   1.00000     0.00000     0

        3  2  0  0  0  0  0  0  0  0999 V2000
         14.7204   -8.4388    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
         12.9704   -5.8637    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
         16.0954   -5.1512    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
        2  1  1  0     0  0
        3  1  1  0     0  0
      M  END
      > <PolymersList>
      0/52/1.50-2.00 1/10/1.00-1.00 2/13/1.28-1.20
      > <TextNode>
      2#qcy9t7#t_13_2#2wt.% pdC02
      1#lj5hkv#t_10_1#1wt.% pd
      0#iuauh5#t_52_0#y-A2023
      > </TextNode>
      > <TextNodeMeta>
      {blocks:{key:iuauh5,text:y-A2023,type:unstyled,depth:0,inlineStyleRanges:{style:fontsize-10,offset:0,length:7},entityRanges:,data:{fontSize:10}},entityMap:{}}
      {blocks:{key:lj5hkv,text:1wt.% pd,type:unstyled,depth:0,inlineStyleRanges:{style:fontsize-10,offset:0,length:8},entityRanges:,data:{fontSize:10}},entityMap:{}}
      {blocks:{key:qcy9t7,text:2wt.% pdC02,type:unstyled,depth:0,inlineStyleRanges:{style:fontsize-10,offset:0,length:11},entityRanges:,data:{fontSize:10}},entityMap:{}}
      > </TextNodeMeta>
      $$$$
    MOL
  end

  let(:molfile_three_r_no_bonds) do
    <<~MOL
      null
        Ketcher  3162611212D 1   1.00000     0.00000     0

        3  0  0  0  0  0  0  0  0  0999 V2000
         10.7676   -9.1906    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
         10.6089   -6.9032    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
         11.1060   -4.6344    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
      M  END
      > <PolymersList>
      0/10/1.00-1.00 1/12/1.00-1.00 2/40/2.00-2.00
      > <TextNode>
      2#1p38o0#t_40_2#asasdfa
      1#hlts8j#t_12_1#sgsfgsf
      0#porj4w#t_10_0#asfasd
      > </TextNode>
      > <TextNodeMeta>
      {"blocks":[{"key":"porj4w","text":"asfasd","type":"unstyled","depth":0,"inlineStyleRanges":[{"style":"fontsize-10","offset":0,"length":6}],"entityRanges":[],"data":{"fontSize":10}}],"entityMap":{}}
      {"blocks":[{"key":"hlts8j","text":"sgsfgsf","type":"unstyled","depth":0,"inlineStyleRanges":[{"style":"fontsize-10","offset":0,"length":7}],"entityRanges":[],"data":{"fontSize":10}}],"entityMap":{}}
      {"blocks":[{"key":"1p38o0","text":"asasdfa","type":"unstyled","depth":0,"inlineStyleRanges":[{"style":"fontsize-10","offset":0,"length":7}],"entityRanges":[],"data":{"fontSize":10}}],"entityMap":{}}
      > </TextNodeMeta>
      $$$$
    MOL
  end

  let(:molfile_one_r) do
    <<~MOL
      null
        Ketcher  3112615482D 1   1.00000     0.00000     0

        1  0  0  0  0  0  0  0  0  0999 V2000
         18.8287   -6.8500    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
      M  END
      > <PolymersList>
      0/10/1.00-1.00
      > <TextNode>
      0#oee0kg#t_10_0#1wt.% pdpt
      > </TextNode>
      > <TextNodeMeta>
      {"blocks":[{"key":"oee0kg","text":"1wt.% pdpt","type":"unstyled","depth":0,"inlineStyleRanges":[],"entityRanges":[],"data":{}}],"entityMap":{}}
      > </TextNodeMeta>
      $$$$
    MOL
  end

  # Minimal CTAB used by the payload/legacy specs below.
  let(:ctab) do
    <<~CTAB
      null
        Ketcher  6232611422D 1   1.00000     0.00000     0

        1  0  0  0  0  0  0  0  0  0999 V2000
          2.0250   -2.0250    0.0000 R#   0  0  0  0  0  0  0  0  0  0  0  0
      M  END

    CTAB
  end

  describe '.has_polymers_list_tag?' do
    it 'returns true for molfile with PolymersList' do
      expect(described_class.has_polymers_list_tag?(molfile_three_r_with_bonds)).to be true
      expect(described_class.has_polymers_list_tag?(molfile_three_r_no_bonds)).to be true
      expect(described_class.has_polymers_list_tag?(molfile_one_r)).to be true
    end

    it 'returns false for plain CTAB molfile' do
      plain = "  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END"
      expect(described_class.has_polymers_list_tag?(plain)).to be false
    end

    it 'returns false for nil or blank' do
      expect(described_class.has_polymers_list_tag?(nil)).to be false
      expect(described_class.has_polymers_list_tag?('')).to be false
    end
  end

  describe '.has_text_node_tag?' do
    it 'returns true for molfile with TextNode block' do
      expect(described_class.has_text_node_tag?(molfile_three_r_with_bonds)).to be true
      expect(described_class.has_text_node_tag?(molfile_three_r_no_bonds)).to be true
      expect(described_class.has_text_node_tag?(molfile_one_r)).to be true
    end

    it 'returns false for molfile without TextNode' do
      plain = "  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n> <PolymersList>\n0/10/1.00-1.00"
      expect(described_class.has_text_node_tag?(plain)).to be false
    end

    it 'returns false for nil or blank' do
      expect(described_class.has_text_node_tag?(nil)).to be false
      expect(described_class.has_text_node_tag?('')).to be false
    end
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

  describe '.has_polymer_or_textnode_blocks?' do
    # Drives Export::ExportSdf#validate_molfile: true keeps the full molfile, false trims to CTAB.
    # The PolymersList half must key on payload, or an exported SDF re-emits Ketcher's empty tag.
    it 'is true for a populated PolymersList block' do
      expect(described_class.has_polymer_or_textnode_blocks?("#{ctab}> <PolymersList>\n0/95/1.00-1.00\n$$$$\n"))
        .to be(true)
    end

    it 'is false for an empty PolymersList block' do
      expect(described_class.has_polymer_or_textnode_blocks?("#{ctab}> <PolymersList>\n$$$$\n")).to be(false)
    end

    it 'is true for a TextNode block regardless of PolymersList payload' do
      molfile = "#{ctab}> <PolymersList>\n> <TextNode>\n0#0ce7f3#t_95_0#label\n> </TextNode>\n$$$$\n"

      expect(described_class.has_polymer_or_textnode_blocks?(molfile)).to be(true)
    end

    it 'is true when a populated PolymersList block is present (branch fixtures)' do
      expect(described_class.has_polymer_or_textnode_blocks?(molfile_one_r)).to be true
    end

    it 'is true when only a TextNode block would be present (conceptually)' do
      mol = "  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n> <TextNode>\n0#x#t_10_0#label\n> </TextNode>"
      expect(described_class.has_polymer_or_textnode_blocks?(mol)).to be true
    end

    it 'is false for a plain molfile' do
      expect(described_class.has_polymer_or_textnode_blocks?(ctab)).to be(false)
      expect(described_class.has_polymer_or_textnode_blocks?(nil)).to be(false)
      expect(described_class.has_polymer_or_textnode_blocks?("  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END")).to be false
    end
  end

  describe '.clean_molfile_for_inchikey' do
    it 'strips PolymersList and TextNode and keeps only CTAB for 3 R# with bonds' do
      cleaned = described_class.clean_molfile_for_inchikey(molfile_three_r_with_bonds)
      expect(cleaned).not_to include('> <PolymersList>')
      expect(cleaned).not_to include('> <TextNode>')
      expect(cleaned).to include('M  END')
      expect(cleaned).to include('R#')
      expect(cleaned.lines.last.strip).to eq('M  END')
    end

    it 'strips PolymersList and TextNode for 3 R# no bonds' do
      cleaned = described_class.clean_molfile_for_inchikey(molfile_three_r_no_bonds)
      expect(cleaned).not_to include('> <PolymersList>')
      expect(cleaned).not_to include('> <TextNode>')
      expect(cleaned).to include('M  END')
    end

    it 'strips PolymersList and TextNode for single R# molfile' do
      cleaned = described_class.clean_molfile_for_inchikey(molfile_one_r)
      expect(cleaned).not_to include('> <PolymersList>')
      expect(cleaned).not_to include('> <TextNode>')
      expect(cleaned).to include('M  END')
      expect(cleaned).to include('18.8287')
    end

    it 'returns nil for nil or blank' do
      expect(described_class.clean_molfile_for_inchikey(nil)).to be_nil
      expect(described_class.clean_molfile_for_inchikey('')).to be_nil
    end
  end

  describe '.keep_only_ctab' do
    it 'keeps only up to first M  END for polymer molfile' do
      result = described_class.keep_only_ctab(molfile_three_r_with_bonds)
      expect(result).to include('M  END')
      expect(result).not_to include('> <PolymersList>')
      expect(result.lines.last.strip).to eq('M  END')
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
