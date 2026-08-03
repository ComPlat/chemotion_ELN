# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MofService do
  let(:service_url) { 'http://mof_service:5000/' }
  let(:cif) { "data_test\n_cell_length_a 1.0\n" }
  let(:mof_result) do
    {
      'mofid' => '[Cu][O].[O-]C(=O)c1cc(C(=O)[O-])cc(C(=O)[O-])c1 MOFid-v1.tbo.cat0',
      'mofkey' => 'Cu.VWYSYJQFPPLOBQ.MOFkey-v1.tbo',
      'smiles' => '[Cu][O].[O-]C(=O)c1cc(C(=O)[O-])cc(C(=O)[O-])c1',
      'smiles_nodes' => '[Cu][O]',
      'smiles_linkers' => '[O-]C(=O)c1cc(C(=O)[O-])cc(C(=O)[O-])c1',
      'topology' => 'tbo',
      'cat' => '0',
    }
  end

  before do
    allow(Rails.configuration).to receive(:respond_to?).and_call_original
    allow(Rails.configuration).to receive(:respond_to?).with(:mof_service).and_return(true)
    allow(Rails.configuration).to receive(:mof_service).and_return(
      OpenStruct.new(mof_service_url: service_url, disabled?: false),
    )
  end

  describe '.enabled?' do
    it 'is true when the service URL is configured' do
      expect(described_class).to be_enabled
    end

    it 'is false when disabled' do
      allow(Rails.configuration).to receive(:mof_service).and_return(
        OpenStruct.new(mof_service_url: service_url, disabled?: true),
      )
      expect(described_class).not_to be_enabled
    end
  end

  describe '#analyze' do
    it 'returns MOFid fields from the sidecar' do
      stub_request(:post, "#{service_url}analyze")
        .to_return(status: 200, body: mof_result.to_json, headers: { 'Content-Type' => 'application/json' })

      result = described_class.new(cif).analyze

      expect(result).to include(
        'mofid' => mof_result['mofid'],
        'mofkey' => mof_result['mofkey'],
        'topology' => 'tbo',
      )
    end

    it 'returns nil when the sidecar errors' do
      stub_request(:post, "#{service_url}analyze").to_return(status: 500, body: '')

      expect(described_class.new(cif).analyze).to be_nil
    end

    it 'returns nil when CIF is blank' do
      expect(described_class.new('').analyze).to be_nil
    end
  end
end
