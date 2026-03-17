# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Chemotion::SvgRenderer do
  # Same three polymer molfiles as in molfile_polymer_support_spec
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

  describe 'polymer molfile parsing' do
    describe '.parse_polymer_payload' do
      it 'returns cleaned_struct, polymers, and text_by_index for 3 R# with bonds' do
        result = described_class.parse_polymer_payload(molfile_three_r_with_bonds)
        expect(result).to include(:cleaned_struct, :polymers, :text_by_index)
        expect(result[:cleaned_struct]).not_to include('> <PolymersList>')
        expect(result[:cleaned_struct]).not_to include('> <TextNode>')
        expect(result[:cleaned_struct]).to include('M  END')
        expect(result[:polymers].size).to eq(3)
        expect(result[:text_by_index]).to eq(0 => 'y-A2023', 1 => '1wt.% pd', 2 => '2wt.% pdC02')
      end

      it 'parses 3 R# no bonds: three polymers and three text labels' do
        result = described_class.parse_polymer_payload(molfile_three_r_no_bonds)
        expect(result[:polymers].size).to eq(3)
        expect(result[:text_by_index]).to eq(0 => 'asfasd', 1 => 'sgsfgsf', 2 => 'asasdfa')
      end

      it 'parses single R# molfile: one polymer and one text label' do
        result = described_class.parse_polymer_payload(molfile_one_r)
        expect(result[:polymers].size).to eq(1)
        expect(result[:text_by_index]).to eq(0 => '1wt.% pdpt')
      end
    end

    describe '.extract_polymers_line' do
      it 'returns full-format line for 3 R# with bonds' do
        line = described_class.extract_polymers_line(molfile_three_r_with_bonds)
        expect(line).to include('0/52/1.50-2.00')
        expect(line).to include('1/10/1.00-1.00')
        expect(line).to include('2/13/1.28-1.20')
      end

      it 'returns full-format line for 3 R# no bonds' do
        line = described_class.extract_polymers_line(molfile_three_r_no_bonds)
        expect(line).to include('0/10/1.00-1.00')
        expect(line).to include('2/40/2.00-2.00')
      end

      it 'returns single entry for 1 R# molfile' do
        line = described_class.extract_polymers_line(molfile_one_r)
        expect(line.strip).to eq('0/10/1.00-1.00')
      end
    end

    describe '.parse_polymers_line' do
      it 'parses full format into atom_index, template_id, height, width' do
        line = '0/52/1.50-2.00 1/10/1.00-1.00 2/13/1.28-1.20'
        polymers = described_class.parse_polymers_line(line)
        expect(polymers.size).to eq(3)
        expect(polymers[0]).to eq(atom_index: 0, template_id: 52, height: 1.5, width: 2.0)
        expect(polymers[1]).to eq(atom_index: 1, template_id: 10, height: 1.0, width: 1.0)
        expect(polymers[2]).to eq(atom_index: 2, template_id: 13, height: 1.28, width: 1.2)
      end

      it 'parses single entry' do
        polymers = described_class.parse_polymers_line('0/10/1.00-1.00')
        expect(polymers).to eq([{ atom_index: 0, template_id: 10, height: 1.0, width: 1.0 }])
      end
    end

    describe '.parse_text_nodes' do
      it 'extracts index => text from TextNode block for 3 R# with bonds' do
        text_by_index = described_class.parse_text_nodes(molfile_three_r_with_bonds)
        expect(text_by_index).to eq(0 => 'y-A2023', 1 => '1wt.% pd', 2 => '2wt.% pdC02')
      end

      it 'extracts text for 3 R# no bonds' do
        text_by_index = described_class.parse_text_nodes(molfile_three_r_no_bonds)
        expect(text_by_index).to eq(0 => 'asfasd', 1 => 'sgsfgsf', 2 => 'asasdfa')
      end

      it 'extracts single text for 1 R# molfile' do
        text_by_index = described_class.parse_text_nodes(molfile_one_r)
        expect(text_by_index).to eq(0 => '1wt.% pdpt')
      end
    end
  end
end
