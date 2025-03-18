# frozen_string_literal: true

require 'rails_helper'

describe Uniprot::Client do
  subject(:client) { described_class.new }


  describe '#get' do
    let(:body_data) do
      file = Rails.root.join("spec/fixtures/uniprot/#{uniprot_id}.json")
      File.exist?(file) ? File.read(file) : ''
    end

    let(:status) { 200 }

    before do
      stub_request(:get, "https://rest.uniprot.org/uniprotkb/#{uniprot_id}")
        .to_return(status: status,
                   body: body_data,
                   headers: { 'Content-Type' => 'application/json' })
    end

    context 'when api returns a result' do
      let(:uniprot_id) { 'P12345' }

      specify { expect(client.get(uniprot_id)).to be_a(Uniprot::Entry) }
    end

    context 'when api returns no result' do
      let(:uniprot_id) { 'PXXXXX' }
      let(:status) { 400 }

      specify { expect { client.get(uniprot_id) }.to raise_error(Uniprot::Client::NotFoundError) }
    end
  end
end
