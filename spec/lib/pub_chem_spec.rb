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
    # hash itself as if it were real GHS data.
    it 'returns nil for a 200 response carrying a Fault body' do
      fault_body = { Fault: { Code: 'PUGVIEW.NotFound', Message: 'No data found' } }.to_json
      allow(HTTParty).to receive(:get).and_return(
        instance_double(HTTParty::Response, success?: true, body: fault_body),
      )

      expect(PubChem.get_lcss_from_cid(962)).to be_nil
    end
  end

  # The contract safe_response introduces: a Fault body on a 200, or any non-2xx, must reach the
  # caller as nil rather than as a body it will parse as data.
  describe '.safe_response gate on the raw-body methods' do
    let(:fault_body) { { Fault: { Code: 'PUGREST.NotFound', Message: 'No CID found' } }.to_json }

    def stub_get(success:, body:)
      allow(HTTParty).to receive(:get).and_return(
        instance_double(HTTParty::Response, success?: success, body: body, parsed_response: JSON.parse(body)),
      )
    end

    def stub_post(success:, body:)
      allow(HTTParty).to receive(:post).and_return(
        instance_double(HTTParty::Response, success?: success, body: body, parsed_response: JSON.parse(body)),
      )
    end

    it 'returns nil from get_molfile_by_inchikey for a 200 carrying a Fault' do
      stub_get(success: true, body: fault_body)

      expect(PubChem.get_molfile_by_inchikey('KEY')).to be_nil
    end

    it 'returns nil from get_xref_by_inchikey for a failed response' do
      stub_get(success: false, body: fault_body)

      expect(PubChem.get_xref_by_inchikey('KEY')).to be_nil
    end

    it 'returns nil from get_cids_from_inchikeys for a 200 carrying a Fault' do
      stub_post(success: true, body: fault_body)

      expect(PubChem.get_cids_from_inchikeys(%w[KEY])).to be_nil
    end

    it 'returns nil from get_record_from_molfile for a 200 carrying a Fault' do
      stub_post(success: true, body: fault_body)

      expect(PubChem.get_record_from_molfile('molfile')).to be_nil
    end

    # A molfile body is not JSON and not a Hash, so the Fault check must let it through
    # untouched rather than treating an unparseable body as a failure.
    it 'passes a plain SDF body through' do
      allow(HTTParty).to receive(:get).and_return(
        instance_double(HTTParty::Response, success?: true, body: 'SDF', parsed_response: 'SDF'),
      )

      expect(PubChem.get_molfile_by_inchikey('KEY')).to eq('SDF')
    end
  end

  # Not found is PubChem's routine "no data" answer; logging one warn per molecule per sweep
  # for it would bury the faults that do warrant attention.
  describe '.fault_response? log level' do
    it 'logs an expected not-found at info' do
      allow(Rails.logger).to receive(:info)

      PubChem.fault_response?({ 'Fault' => { 'Code' => 'PUGVIEW.NotFound', 'Message' => 'No data found' } })

      expect(Rails.logger).to have_received(:info).with(/PUGVIEW.NotFound/)
    end

    it 'keeps warn for an unexpected fault code' do
      allow(Rails.logger).to receive(:warn)

      PubChem.fault_response?({ 'Fault' => { 'Code' => 'PUGREST.ServerBusy', 'Message' => 'Too busy' } })

      expect(Rails.logger).to have_received(:warn).with(/PUGREST.ServerBusy/)
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
