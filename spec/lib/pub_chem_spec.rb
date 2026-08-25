# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'PubChem' do
  # The outcome is not cosmetic: only :not_found reaches Molecule#record_pubchem_miss!, which
  # stamps pubchem_checked_at and takes the molecule out of PubchemLookupJob's pending scope
  # for PUBCHEM_MISS_TTL. Mapping a throttle response to :not_found would blacklist molecules
  # PubChem does have records for.
  describe '.fetch_record_from_inchikey outcomes' do
    def stub_response(code, success: false)
      response = instance_double(HTTParty::Response, success?: success, code: code)
      allow(HTTParty).to receive(:get).and_return(response)
      response
    end

    it 'reports :ok for a successful response' do
      response = stub_response(200, success: true)

      expect(PubChem.fetch_record_from_inchikey('KEY')).to eq([response, :ok])
    end

    # 404 is the only code that means "PubChem answered, and has no such compound".
    it 'reports :not_found for a 404' do
      stub_response(404)

      expect(PubChem.fetch_record_from_inchikey('KEY')).to eq([nil, :not_found])
    end

    # PubChem returns 403 to an IP over its request-volume policy and 429 under dynamic
    # throttling. Both are about us, not the structure, and must stay retryable.
    it 'reports :unavailable for a throttle response rather than remembering it as a miss' do
      [403, 429].each do |code|
        stub_response(code)

        expect(PubChem.fetch_record_from_inchikey('KEY')).to eq([nil, :unavailable])
      end
    end

    it 'reports :unavailable for a server-side failure' do
      stub_response(503)

      expect(PubChem.fetch_record_from_inchikey('KEY')).to eq([nil, :unavailable])
    end

    it 'reports :unavailable when the request raises' do
      allow(HTTParty).to receive(:get).and_raise(Net::OpenTimeout)

      expect(PubChem.fetch_record_from_inchikey('KEY')).to eq([nil, :unavailable])
    end
  end

  describe '.get_lcss_from_cid' do
    # The cid arrives from element_tags.taggable_data, where a value written as a JSON string
    # deserialises to a String. The old `is_a? Integer` guard rejected that outright, silently
    # disabling LCSS for the molecule.
    it 'accepts a numeric string cid' do
      allow(HTTParty).to receive(:get).and_return(instance_double(HTTParty::Response, success?: false))

      PubChem.get_lcss_from_cid('962')

      expect(HTTParty).to have_received(:get).with(%r{/compound/962/JSON}, anything)
    end

    it 'rejects anything not wholly numeric without calling out' do
      allow(HTTParty).to receive(:get)

      ['abc', '96.2', '9 6', '', nil].each do |bad|
        expect(PubChem.get_lcss_from_cid(bad)).to be_nil
      end

      expect(HTTParty).not_to have_received(:get)
    end

    # PubChem answers an unknown cid with HTTP 200 and a Fault body, not a 404 -- so success?
    # alone does not catch it, and the caller (Molecule#pubchem_lcss) used to store the Fault
    # hash itself as if it were real GHS data. See #627.
    it 'returns nil for a 200 response carrying a Fault body' do
      fault_body = { Fault: { Code: 'PUGVIEW.NotFound', Message: 'No data found' } }.to_json
      allow(HTTParty).to receive(:get).and_return(
        instance_double(HTTParty::Response, success?: true, body: fault_body),
      )

      expect(PubChem.get_lcss_from_cid(962)).to be_nil
    end
  end

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
