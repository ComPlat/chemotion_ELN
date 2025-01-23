# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Import::ImportChemicals do
  describe '.extract_product_number' do
    it 'extracts a product number from a Sigma-Aldrich URL' do
      url = 'http://www.sigmaaldrich.com/MSDS/MSDS/DisplayMSDSPage.do?country=DE&language=DE&productNumber=131377&brand=ALDRICH'
      expect(described_class.extract_product_number(url)).to eq('131377')
      url2 = 'https://www.sigmaaldrich.com/US/en/product/sigma/a5376'
      expect(described_class.extract_product_number(url2)).to eq('a5376')
    end
  end

  describe '.set_safety_phrases' do
    let(:chemical) { { 'chemical_data' => [{}] } }

    it 'sets pictogram to safety phrases' do
      described_class.set_safety_phrases(chemical, 'pictograms', 'GHS02, GHS07')
      actual_phrases = chemical['chemical_data'][0]['safetyPhrases']['pictograms'].map(&:strip)
      expect(actual_phrases).to eq(%w[GHS02 GHS07])
    end

    it 'sets H statement to safety phrases' do
      described_class.set_safety_phrases(chemical, 'h_statements', 'H225-H302')
      expect(chemical['chemical_data'][0]['safetyPhrases']['h_statements']).to eq(
        {
          'H225' => ' Highly flammable liquid and vapour',
          'H302' => ' Harmful if swallowed',
        },
      )
    end

    it 'sets P statement to safety phrases' do
      described_class.set_safety_phrases(chemical, 'p_statements', 'P101,P102,P103')
      expect(chemical['chemical_data'][0]['safetyPhrases']['p_statements']).to eq(
        {
          'P101' => ' If medical advice is needed, have product container or label at hand.',
          'P102' => ' Keep out of reach of children.',
          'P103' => ' Read label before use.',
        },
      )
    end
  end

  describe '.sets amount and volume of chemical' do
    let(:chemical) { { 'chemical_data' => [{}] } }

    it 'add amount value and unit' do
      described_class.set_chemical_amount_or_volume(chemical, 'amount', '10 mg')
      expect(chemical['chemical_data'][0]['amount']['value']).to eq(10.0)
      expect(chemical['chemical_data'][0]['amount']['unit']).to eq('mg')
    end

    it 'add volume value and unit' do
      described_class.set_chemical_amount_or_volume(chemical, 'volume', '6.4 mg')
      expect(chemical['chemical_data'][0]['volume']['value']).to eq(6.4)
      expect(chemical['chemical_data'][0]['volume']['unit']).to eq('ml')
    end
  end

  describe '.to_snake_case' do
    it 'converts a string with spaces to snake case' do
      expect(described_class.to_snake_case('H statements')).to eq('h_statements')
    end
  end

  describe '.should_process_key' do
    it 'returns true for keys that should be processed' do
      expect(described_class.should_process_key('cas')).to be(false)
    end
  end

  describe '.process_column' do
    let(:chemical) { Chemical.new }
    let(:column_header) { 'Amount' }
    let(:value) { '5g' }

    it 'sets the amount hash when amount is present' do
      chemical['chemical_data'] = [{}]
      described_class.process_column(chemical, column_header, value)
      expect(chemical['chemical_data'][0]['amount']).to eq(
        {
          'value' => 5,
          'unit' => 'g',
        },
      )
    end

    it 'sets the safety sheet info when a safety sheet link is present' do
      chemical['chemical_data'] = [{}]
      safety_sheet_value = 'http://www.sigmaaldrich.com/MSDS/MSDS/DisplayMSDSPage.do?country=DE&language=DE&productNumber=131377&brand=ALDRICH'
      product_link = 'https://www.sigmaaldrich.com/US/en/product/aldrich/131377'
      content_type = 'application/pdf'
      response_body = 'sample response body'
      allow(HTTParty).to receive(:get).with(safety_sheet_value || product_link, anything).and_return(
        instance_double(HTTParty::Response, headers: { 'Content-Type' => content_type }, body: response_body),
      )
      described_class.process_column(chemical, 'Safety Sheet Link Merck', safety_sheet_value)
      expect(chemical['chemical_data'][0]['merckProductInfo']).to be_present
      described_class.process_column(chemical, 'product link', product_link)
      expect(chemical['chemical_data'][0]['merckProductInfo']).to be_present
    end

    it 'sets the safety phrases when safety phrases are present' do
      chemical['chemical_data'] = [{}]
      described_class.process_column(chemical, 'H Statements', 'H350-H351')
      expect(chemical['chemical_data'][0]['safetyPhrases']['h_statements']).to eq(
        {
          'H350' => ' May cause cancer',
          'H351' => ' Suspected of causing cancer',
        },
      )
    end
  end

  describe 'build_chemical' do
    let(:row) { { 'cas' => '123-45-6', 'price' => '50 EUR' } }
    let(:header) { %w[cas price] }
    let(:chemical) { create(:chemical) }

    it 'creates a chemical with valid data' do
      allow(PubChem).to receive(:get_cid_from_inchikey).and_return('12345')
      expect(described_class.build_chemical(row, header)).not_to be_nil
    end
  end
end
