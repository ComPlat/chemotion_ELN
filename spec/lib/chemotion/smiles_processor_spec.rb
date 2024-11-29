# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::SmilesProcessor do
  let(:valid_smiles) { 'CCO' }
  let(:invalid_smiles) { 'invalid_smiles' }
  let(:editor) { 'ketcher' }
  let(:svg) { '<svg>...</svg>' }
  let(:babel_info) { { ob_log: 'Some log data' } }
  let(:fetcher_instance) { instance_double(Chemotion::MoleculeFetcher) }

  before do
    molecule = create(:molecule)
    allow(Chemotion::MoleculeFetcher).to receive(:new).and_return(fetcher_instance)
    allow(fetcher_instance).to receive(:fetch_or_create).and_return(molecule)
    allow(Chemotion::MoleculeFetcher).to receive(:new).and_call_original
  end

  context 'with valid SMILES' do
    let(:params) { { smiles: valid_smiles, editor: editor, svg_file: svg } }

    it 'returns a molecule instance with valid attributes' do
      processor_result = described_class.new(params).process
      binding.pry
      expect(processor_result.keys).to include(:temp_svg, :ob_log)
    end
  end

  context 'with invalid SMILES' do
    let(:params) { { smiles: invalid_smiles, editor: editor, svg_file: svg } }

    it 'returns a molecule instance error in ob_log key' do
      processor = described_class.new(params)
      processor_result = processor.process
      expect(processor_result).not_to be_nil
      expect(processor_result.keys).to include(:temp_svg, :ob_log)
      expect(processor_result[:ob_log][:error]).to be_present
    end
  end
end
