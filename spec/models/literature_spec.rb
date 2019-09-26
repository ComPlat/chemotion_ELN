# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'Literature', type: :model do
  describe 'creation' do
    let(:lit) { create(:literature) }

    it 'is possible to create a valid literature' do
      expect(lit.valid?).to eq true
    end
  end

  describe 'doi validation' do
    let(:lit_i) { build(:literature, doi: '10.1006/jmbi.1998.2354') }
    let(:lit_ii) { build(:literature, doi: 'DOI: 10.1006/jmbi.1998.2354') }
    let(:lit_iii) { build(:literature, doi: 'http://doi.org/10.1006/jmbi.1998.2354') }
    let(:formated_doi) { '10.1006/jmbi.1998.2354' }

    let(:lit_blk) { build(:literature, doi: nil, title: nil, url: nil) }

    it 'formats the doi before save' do
      expect(lit_i.save && lit_i.doi).to eq formated_doi
      expect(lit_ii.save && lit_ii.doi).to eq formated_doi
      expect(lit_iii.save && lit_iii.doi).to eq formated_doi
    end

    it 'validate the presence of either a title, a url, or a doi' do
      expect(lit_blk.save).to be false
    end
  end
end
