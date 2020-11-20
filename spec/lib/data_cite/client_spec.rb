# frozen_string_literal: true

require 'rails_helper'

describe DataCite::Client do
  subject(:client) { described_class.new }

  let(:doi) { '10.5438/0012' }

  before do
    stub_request(:get, 'https://api.test.datacite.org/dois/10.5438/0012')
      .to_return(status: 200,
                 body: File.read(
                   Rails.root.join('spec/fixtures/data_cite/get_doi_response.json')
                 ),
                 headers: { 'Content-Type' => 'application/json' })
  end

  describe '#get' do
    specify { expect(client.get(doi)).to be_a(Hash) }
  end
end
