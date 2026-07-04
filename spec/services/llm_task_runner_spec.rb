# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmTaskRunner do
  let(:user)          { create(:person) }
  let(:base_url)      { 'https://ki-toolbox.scc.kit.edu/api' }
  let(:api_key)       { 'sk-test-runner-key' }
  let(:default_model) { 'kit.qwen3.5-397b-A17b' }

  let!(:provider) do
    create(:llm_provider,
           enabled:       true,
           base_url:      base_url,
           api_key:       api_key,
           default_model: default_model)
  end

  # Give the user access to AI features
  before do
    Matrice.find_or_create_by(name: 'aiFeatures')
           .update!(enabled: true, exclude_ids: [])
  end
  after { Matrice.find_by(name: 'aiFeatures')&.destroy }

  # ── JSON-output task: sds_extraction ──────────────────────────────────────

  describe '.run with sds_extraction (json output)' do
    let(:sds_text) { 'Phenol CAS 108-95-2. H301 H311. GHS06 GHS08. Signal word: Danger.' }

    let(:llm_json_response) do
      {
        'choices' => [{
          'message' => {
            'content' => {
              'chemical_name'      => 'Phenol',
              'cas_number'         => '108-95-2',
              'signal_word'        => 'Danger',
              'hazard_statements'  => %w[H301 H311],
              'ghs_codes'          => %w[GHS06 GHS08],
            }.to_json,
          },
        }],
      }.to_json
    end

    before do
      stub_request(:post, "#{base_url}/v1/chat/completions")
        .to_return(status: 200, body: llm_json_response,
                   headers: { 'Content-Type' => 'application/json' })
    end

    it 'returns a validated Hash with extracted chemical data' do
      result = described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
      expect(result).to be_a(Hash)
      expect(result['chemical_name']).to eq('Phenol')
      expect(result['cas_number']).to eq('108-95-2')
      expect(result['hazard_statements']).to include('H301')
    end

    it 'passes json_mode: true to LlmClient' do
      described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
      expect(WebMock).to have_requested(:post, "#{base_url}/v1/chat/completions")
        .with { |req| JSON.parse(req.body)['response_format'] == { 'type' => 'json_object' } }
    end

    it 'sends a non-blank user prompt containing the context text' do
      described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
      expect(WebMock).to have_requested(:post, "#{base_url}/v1/chat/completions")
        .with { |req| JSON.parse(req.body)['messages'].any? { |m| m['content'].include?(sds_text) } }
    end

    it 'uses the task timeout for the LlmClient' do
      task = Chemotion::LlmTaskRegistry.find('sds_extraction')
      expect(LlmClient).to receive(:new).with(
        hash_including(timeout: task.timeout_seconds),
      ).and_call_original
      described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
    end

    context 'when the model returns mixture SDS data with spaced P-statement codes' do
      let(:mixture_response) do
        {
          'choices' => [{
            'message' => {
              'content' => {
                'chemical_name' => 'Formaldehydlösung',
                'is_mixture' => true,
                'mixture_components' => [
                  { 'name' => 'Formaldehyde', 'cas_number' => '50-00-0', 'concentration' => '37 %' },
                  { 'name' => 'Methanol', 'cas_number' => '67-56-1', 'concentration' => '< 1 %' },
                ],
                'signal_word' => 'Danger',
                'hazard_statements' => %w[H226 H302 H314 H330 H350],
                'eu_h_statements' => ['EUH071'],
                # LLM may return P-codes with spaces around "+" — validator normalises these
                'precautionary_statements' => ['P210', 'P280', 'P301 + P312', 'P304 + P340 + P310'],
                'ghs_codes' => %w[GHS02 GHS06 GHS08],
              }.to_json,
            },
          }],
        }.to_json
      end

      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 200, body: mixture_response,
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'normalises combined P-statement codes (removes spaces around +)' do
        result = described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
        expect(result['precautionary_statements']).to include('P301+P312')
        expect(result['precautionary_statements']).to include('P304+P340+P310')
        expect(result['precautionary_statements']).not_to include('P301 + P312')
      end

      it 'returns mixture_components array' do
        result = described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
        expect(result['mixture_components']).to be_an(Array)
        expect(result['mixture_components'].map { |c| c['cas_number'] }).to include('50-00-0')
      end

      it 'returns eu_h_statements' do
        result = described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
        expect(result['eu_h_statements']).to include('EUH071')
      end

      it 'passes validation even though cas_number is absent (mixture)' do
        expect do
          described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
        end.not_to raise_error
      end
    end

    context 'when the model wraps JSON in markdown fences' do
      let(:fenced_response) do
        {
          'choices' => [{
            'message' => {
              'content' => "```json\n{\"chemical_name\":\"Phenol\",\"cas_number\":\"108-95-2\"}\n```",
            },
          }],
        }.to_json
      end

      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 200, body: fenced_response,
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'strips markdown fences and parses JSON correctly' do
        result = described_class.run(task_name: 'sds_extraction', user: user, context: sds_text)
        expect(result).to be_a(Hash)
        expect(result['chemical_name']).to eq('Phenol')
      end
    end

    context 'when the model returns invalid JSON' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 200,
                     body: { 'choices' => [{ 'message' => { 'content' => 'Not JSON at all.' } }] }.to_json,
                     headers: { 'Content-Type' => 'application/json' })
      end

      it 'raises Errors::LlmProviderError' do
        expect { described_class.run(task_name: 'sds_extraction', user: user, context: sds_text) }
          .to raise_error(Errors::LlmProviderError, /invalid JSON/)
      end
    end
  end

  # ── Text-output task: report_generation ───────────────────────────────────

  describe '.run with report_generation (text output)' do
    let(:experiment_data) { 'Reaction of benzene with HNO3/H2SO4. Yield 72%.' }
    let(:report_text)     { '## Nitration of Benzene\n\nObjective: ...' }

    before do
      stub_request(:post, "#{base_url}/v1/chat/completions")
        .to_return(
          status:  200,
          body:    { 'choices' => [{ 'message' => { 'content' => report_text } }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
    end

    it 'returns raw text (not parsed as JSON)' do
      result = described_class.run(task_name: 'report_generation', user: user, context: experiment_data)
      expect(result).to be_a(String)
      expect(result).to eq(report_text)
    end

    it 'does NOT set json_mode on the request' do
      described_class.run(task_name: 'report_generation', user: user, context: experiment_data)
      expect(WebMock).not_to have_requested(:post, "#{base_url}/v1/chat/completions")
        .with { |req| JSON.parse(req.body).key?('response_format') }
    end
  end

  # ── Extra template variables ───────────────────────────────────────────────

  describe '.run with research_assistant (extra template variable)' do
    let(:question) { 'What protecting group should I use for an amine?' }

    before do
      stub_request(:post, "#{base_url}/v1/chat/completions")
        .to_return(
          status:  200,
          body:    { 'choices' => [{ 'message' => { 'content' => 'Use Boc protection.' } }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
    end

    it 'substitutes both context and question in the user prompt' do
      described_class.run(
        task_name: 'research_assistant',
        user:      user,
        context:   'Amine synthesis experiment',
        question:  question,
      )
      expect(WebMock).to have_requested(:post, "#{base_url}/v1/chat/completions")
        .with { |req|
          msgs     = JSON.parse(req.body)['messages']
          user_msg = msgs.find { |m| m['role'] == 'user' }
          user_msg['content'].include?('Amine synthesis experiment') &&
            user_msg['content'].include?(question)
        }
    end
  end

  # ── Error propagation ──────────────────────────────────────────────────────

  describe 'error handling' do
    it 'raises ArgumentError for unknown task name' do
      expect { described_class.run(task_name: 'nonexistent', user: user, context: 'x') }
        .to raise_error(ArgumentError, /Unknown LLM task/)
    end

    it 'raises LlmNotConfiguredError when no provider is configured' do
      provider.update!(enabled: false)
      expect do
        described_class.run(task_name: 'sds_extraction', user: user, context: 'x')
      end.to raise_error(Errors::LlmNotConfiguredError)
    end

    context 'when provider returns 401' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 401, body: '{"error":"Unauthorized"}')
      end

      it 'raises LlmAuthenticationError' do
        expect do
          described_class.run(task_name: 'sds_extraction', user: user, context: 'x')
        end.to raise_error(Errors::LlmAuthenticationError)
      end
    end
  end

  # ── Audit logging ──────────────────────────────────────────────────────────

  describe 'audit logging' do
    let(:success_body) do
      { 'choices' => [{ 'message' => { 'content' => '{"chemical_name":"Phenol"}' } }] }.to_json
    end

    before do
      stub_request(:post, "#{base_url}/v1/chat/completions")
        .to_return(status: 200, body: success_body,
                   headers: { 'Content-Type' => 'application/json' })
    end

    it 'calls LlmAuditLogger.log with success: true on success' do
      expect(LlmAuditLogger).to receive(:log).with(
        hash_including(user: user, task: 'sds_extraction', success: true),
      )
      described_class.run(task_name: 'sds_extraction', user: user, context: 'test')
    end

    it 'calls LlmAuditLogger.log with success: false on error' do
      stub_request(:post, "#{base_url}/v1/chat/completions")
        .to_return(status: 500, body: 'error')

      expect(LlmAuditLogger).to receive(:log).with(
        hash_including(success: false, error: an_instance_of(Errors::LlmProviderError)),
      )
      expect do
        described_class.run(task_name: 'sds_extraction', user: user, context: 'test')
      end.to raise_error(Errors::LlmProviderError)
    end
  end
end
