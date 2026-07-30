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

  describe '.has_polymer_or_textnode_blocks?' do
    it 'returns true when PolymersList is present' do
      expect(described_class.has_polymer_or_textnode_blocks?(molfile_one_r)).to be true
    end

    it 'returns true when only TextNode would be present (conceptually)' do
      mol = "  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END\n> <TextNode>\n0#x#t_10_0#label\n> </TextNode>"
      expect(described_class.has_polymer_or_textnode_blocks?(mol)).to be true
    end

    it 'returns false for plain molfile' do
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
end
