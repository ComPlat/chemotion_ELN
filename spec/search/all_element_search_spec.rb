require 'rails_helper'

RSpec.describe AllElementSearch do
  subject { described_class }
  let!(:s1) { create(:sample, name: "testtest") }
  let!(:s2) { create(:sample, name: "t3st-1") }

  describe 'search_by_substring' do
    it 'searches all elements for given substring' do
      expect(subject.new('st').search_by_substring.results.size).to eq 2
      expect(subject.new('-1').search_by_substring.results.size).to eq 1
    end
  end
end
