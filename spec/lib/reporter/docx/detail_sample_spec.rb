# frozen_string_literal: true

require 'rails_helper'

describe 'Reporter::Docx::DetailSample' do
  let!(:user) { create(:user) }
  let!(:collection) { create(:collection, user: user) }
  let(:sample) { create(:sample, collections: [collection]) }

  let(:instance) do
    Reporter::Docx::DetailSample.new(sample: sample,
                                     spl_settings: all_spl_settings,
                                     rxn_settings: all_rxn_settings,
                                     configs: all_configs)
  end

  describe '.content' do
    let!(:content) { instance.content }

    it 'returns a Hash' do
      expect(content.class).to eq(Hash)
    end

    it 'has a png image & a bin file' do
      expect(content[:structure].class).to eq(Sablon::Chem::Definition)
      expect(content[:structure].img.name.split('.').last).to eq('png')
      expect(content[:structure].ole.name.split('.').last).to eq('bin')
    end

    it 'has correct content' do
      analyses_content = JSON.parse(sample.analyses[0]['extended_metadata']['content'])
      target_html = Sablon.content(:html, Reporter::Delta.new(analyses_content).getHTML)
      expect(content[:analyses]).to eq(target_html)
    end
  end

  describe 'reaction description' do
    it 'uses the text of the step the sample belongs to' do
      reaction = create(:reaction, reaction_type: 'multi_step',
                                   description: { 'ops' => [{ 'insert' => "step one\n" }] })
      ReactionStep.create!(reaction: reaction, position: 1, description: { 'ops' => [{ 'insert' => "step one\n" }] })
      second = ReactionStep.create!(reaction: reaction, position: 2,
                                    description: { 'ops' => [{ 'insert' => "step two\n" }] })
      ReactionsProductSample.create!(reaction: reaction, sample: sample, reaction_step: second)

      expect(instance.send(:init_item)).to eq([{ 'insert' => "step two\n" }])
    end
  end
end
