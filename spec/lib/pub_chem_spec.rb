# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'PubChem' do
  describe 'most_occurance' do
    it 'returns the most common element' do
      target = [1, 2, 3, 4, 5, 1, 2, 3, 1]
      result = PubChem.most_occurance(target)
      expect(result).to eq 1

      target = [1, 2, 3, 4, 5, 1, 2, 3, 2, 3]
      result = PubChem.most_occurance(target)
      expect(result).to eq 2

      target = []
      result = PubChem.most_occurance(target)
      expect(result).to be_nil
    end
  end

  describe '.get_cas_from_cid' do
    it 'builds the correct URL' do
      expected_url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/123456/XML?heading=CAS'
      expected_body = '<Value><StringWithMarkup><String>123-45-6</String></StringWithMarkup></Value>'
      allow(HTTParty).to(
        receive(:get).with(expected_url, anything)
                     .and_return(instance_double(HTTParty::Response, success?: true, body: expected_body)),
      )

      [123_456, '123456', ' 1234 , 12345 ,123456 ', "1 \n \n 1234 \n 12345 \n 123456"].each do |cid|
        result = PubChem.get_cas_from_cid(cid)
        expect(result).to eq ['123-45-6']
      end
    end
  end
end
