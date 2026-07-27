# frozen_string_literal: true

require 'rails_helper'

RSpec.describe SpectralExtractionService do
  let(:user)     { create(:person) }
  let(:base_url) { 'https://ki-toolbox.scc.kit.edu/api' }
  let(:model)    { 'kit.qwen3.5-397b-A17b' }

  let!(:provider) do
    create(:llm_provider, base_url: base_url, api_key: 'sk-test', default_model: model)
  end

  def stub_llm(json_hash)
    stub_request(:post, "#{base_url}/v1/chat/completions")
      .to_return(
        status:  200,
        body:    { 'choices' => [{ 'message' => { 'content' => json_hash.to_json } }] }.to_json,
        headers: { 'Content-Type' => 'application/json' },
      )
  end

  describe '.call' do
    context 'with a 13C NMR measurement' do
      let(:text) { '13C NMR (100 MHz, CDCl3 [77.0 ppm], ppm) δ = 164.4, 128.3 (q, J = 33.1 Hz).' }

      before { stub_llm('nucleus' => '13C', 'signals' => [{ 'shift_ppm' => 164.4 }]) }

      it 'detects the technique, runs the task and returns structured data' do
        result = described_class.call(user: user, content: text, kind: '13C NMR')
        expect(result.technique).to eq('nmr')
        expect(result.technique_label).to eq('13C NMR')
        expect(result.nucleus).to eq('13C')
        expect(result.model).to eq(model)
        expect(result.data['nucleus']).to eq('13C')
      end

      it 'injects the nucleus-specific prompt and the measurement text into the request' do
        described_class.call(user: user, content: text)
        expect(WebMock).to have_requested(:post, "#{base_url}/v1/chat/completions").with { |req|
          user_msg = JSON.parse(req.body)['messages'].find { |m| m['role'] == 'user' }
          user_msg['content'].include?('13C NMR') &&
            user_msg['content'].include?('"nucleus": "13C"') &&
            user_msg['content'].include?(text)
        }
      end
    end

    context 'with content given as a Quill delta' do
      let(:delta) { { 'ops' => [{ 'insert' => 'IR (ATR, ṽ) = 2941, 1707 cm-1.' }] } }

      before { stub_llm('technique' => 'IR', 'bands' => [{ 'wavenumber' => 1707 }]) }

      it 'flattens the delta and detects IR' do
        result = described_class.call(user: user, content: delta,
                                      kind: 'infrared absorption spectroscopy (IR)')
        expect(result.technique).to eq('ir')
        expect(result.data['bands'].first['wavenumber']).to eq(1707)
      end
    end

    context 'with an EI-MS measurement (no kind supplied)' do
      before { stub_llm('technique' => 'EI', 'base_peak_mz' => 86) }

      it 'detects mass spectrometry from the content' do
        result = described_class.call(user: user, content: 'EI (m/z, 70 eV): 353 (12) [M]+, 86 (100).')
        expect(result.technique).to eq('ms')
        expect(result.nucleus).to be_nil
      end
    end

    context 'with an MS measurement containing a halogen isotope doublet (Br 79/81)' do
      let(:text) do
        'MS (ESI, H2O), m/z (%): 301/303 (4/4) [M-Br]+, 253 (68), 222 (100) [M-2Br]+, 181 (79). ' \
        'HRMS (C15H1479BrN2)+: calcd: 301.0335, found: 301.0329.'
      end

      before { stub_llm('technique' => 'ESI', 'peaks' => [{ 'mz' => 301 }, { 'mz' => 303 }]) }

      it 'detects mass spectrometry' do
        result = described_class.call(user: user, content: text)
        expect(result.technique).to eq('ms')
      end

      it 'includes the isotope-doublet worked example and formula/charge-splitting rule in the prompt ' \
         '(a real published measurement that previously made the model bail out to a "raw"-only response)' do
        described_class.call(user: user, content: text)
        expect(WebMock).to have_requested(:post, "#{base_url}/v1/chat/completions").with { |req|
          user_msg = JSON.parse(req.body)['messages'].find { |m| m['role'] == 'user' }
          user_msg['content'].include?('ISOTOPE DOUBLET') &&
            user_msg['content'].include?('separate "charge" field') &&
            user_msg['content'].include?(text)
        }
      end
    end

    context 'with blank content' do
      it 'raises a friendly input error' do
        expect { described_class.call(user: user, content: '   ') }
          .to raise_error(described_class::Error, /No analysis content/)
      end
    end

    context 'when no provider is configured' do
      before { provider.update!(enabled: false) }

      it 'raises LlmNotConfiguredError' do
        expect { described_class.call(user: user, content: '1H NMR δ = 7.2 (s, 1H).') }
          .to raise_error(Errors::LlmNotConfiguredError)
      end
    end
  end
end
