# frozen_string_literal: true

require 'rails_helper'

RSpec.describe MofService do
  let(:service_url) { 'http://converter:4000/' }
  let(:cif) { "data_test\n_cell_length_a 1.0\n" }

  # The converter returns every value as a string under a "mofid." namespace.
  let(:converter_response) do
    {
      'mofid.mofid' => '[Cu][O].[O-]C(=O)c1cc(C(=O)[O-])cc(C(=O)[O-])c1 MOFid-v1.tbo.cat0',
      'mofid.mofkey' => 'Cu.VWYSYJQFPPLOBQ.MOFkey-v1.tbo',
      'mofid.smiles' => '[Cu][O].[O-]C(=O)c1cc(C(=O)[O-])cc(C(=O)[O-])c1',
      'mofid.smiles_nodes' => '[Cu][O]',
      'mofid.smiles_linkers' => '[O-]C(=O)c1cc(C(=O)[O-])cc(C(=O)[O-])c1',
      'mofid.topology' => 'tbo',
      'mofid.cat' => '0',
      'mofid.ccdc_number' => '',
      'mofid.node_ratios' => '3',
      'mofid.linker_ratios' => '4',
    }
  end

  # Mirrors what config_for returns in production, so #mof_service_url and the
  # #disabled? predicate (via OrderedOptions#method_missing) behave for real.
  def mof_config(url:, disabled:)
    ActiveSupport::OrderedOptions.new.tap do |config|
      config.mof_service_url = url
      # config/default_missing.yml stores a literal "disabled?" key because
      # OrderedOptions#disabled? just reads self["disabled?"]; mirror that.
      config.disabled = disabled
      config[:disabled?] = disabled
    end
  end

  before do
    allow(Rails.configuration).to receive(:respond_to?).and_call_original
    allow(Rails.configuration).to receive(:respond_to?).with(:mof_service).and_return(true)
    allow(Rails.configuration).to receive(:mof_service).and_return(
      mof_config(url: service_url, disabled: false),
    )
  end

  describe '.enabled?' do
    it 'is true when the service URL is configured' do
      expect(described_class).to be_enabled
    end

    it 'is false when disabled' do
      allow(Rails.configuration).to receive(:mof_service).and_return(
        mof_config(url: service_url, disabled: true),
      )
      expect(described_class).not_to be_enabled
    end
  end

  describe '#analyze' do
    it 'strips the "mofid." prefix and returns the bare MOFid fields' do
      stub_request(:post, "#{service_url}mofid")
        .to_return(status: 200, body: converter_response.to_json, headers: { 'Content-Type' => 'application/json' })

      result = described_class.new(cif).analyze

      expect(result).to include(
        'mofid' => converter_response['mofid.mofid'],
        'mofkey' => converter_response['mofid.mofkey'],
        'topology' => 'tbo',
      )
    end

    it 'parses the comma-separated ratio strings into integer arrays' do
      stub_request(:post, "#{service_url}mofid")
        .to_return(status: 200, body: converter_response.merge('mofid.node_ratios' => '3,1').to_json)

      result = described_class.new(cif).analyze

      expect(result['node_ratios']).to eq([3, 1])
      expect(result['linker_ratios']).to eq([4])
    end

    it 'posts the CIF as a multipart file field' do
      stub = stub_request(:post, "#{service_url}mofid")
             .with(headers: { 'Content-Type' => %r{\Amultipart/form-data} })
             .to_return(status: 200, body: converter_response.to_json)

      described_class.new(cif).analyze

      expect(stub).to have_been_requested
    end

    it 'returns nil when the converter returns an empty object (runtime missing)' do
      stub_request(:post, "#{service_url}mofid").to_return(status: 200, body: '{}')

      expect(described_class.new(cif).analyze).to be_nil
    end

    it 'returns nil when the converter errors' do
      stub_request(:post, "#{service_url}mofid").to_return(status: 400, body: '{"error":"File could not be used to generate MOFid"}')

      expect(described_class.new(cif).analyze).to be_nil
    end

    it 'returns nil when CIF is blank' do
      expect(described_class.new('').analyze).to be_nil
    end
  end
end
