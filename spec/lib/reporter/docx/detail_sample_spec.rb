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
end
