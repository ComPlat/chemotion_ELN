# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::LlmTasksAPI do
  include_context 'api request authorization context'

  let(:headers)  { { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' } }
  let(:base_url) { 'https://ki-toolbox.scc.kit.edu/api' }
  let(:model)    { 'kit.qwen3.5-397b-A17b' }

  let!(:provider) do
    create(:llm_provider, base_url: base_url, api_key: 'sk-test', default_model: model)
  end

  describe 'POST /api/v1/llm/spectral/extract' do
    context 'with a valid NMR measurement' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions").to_return(
          status:  200,
          body:    { 'choices' => [{ 'message' => {
            'content' => { 'nucleus' => '1H', 'signals' => [{ 'shift_ppm' => 7.26 }] }.to_json,
          } }] }.to_json,
          headers: { 'Content-Type' => 'application/json' },
        )
        # Stub the notification call in tests that aren't about the notification itself —
        # generate_notifications() is a PG function this test DB doesn't have loaded.
        allow(Message).to receive(:create_msg_notification)
      end

      it 'returns the structured result with technique + model' do
        post '/api/v1/llm/spectral/extract',
             params:  { content: '1H NMR (400 MHz, CDCl3) δ = 7.26 (s, 1H).', kind: '1H NMR' }.to_json,
             headers: headers

        expect(response).to have_http_status(:success)
        body = JSON.parse(response.body)
        expect(body['technique']).to eq('nmr')
        expect(body['technique_label']).to eq('1H NMR')
        expect(body['model']).to eq(model)
        expect(body['result']['nucleus']).to eq('1H')
      end

      it 'persists a success notification (so it shows up in the System Notification panel, ' \
         'not just as a transient toast)' do
        expect(Message).to receive(:create_msg_notification)
          .with(hash_including(message_content: hash_including('level' => 'info')))

        post '/api/v1/llm/spectral/extract',
             params:  { content: '1H NMR (400 MHz, CDCl3) δ = 7.26 (s, 1H).', kind: '1H NMR' }.to_json,
             headers: headers
      end

      it 'accepts a Quill delta object as content' do
        post '/api/v1/llm/spectral/extract',
             params:  { content: { ops: [{ insert: '1H NMR δ = 7.26 (s, 1H).' }] }, kind: '1H NMR' }.to_json,
             headers: headers

        expect(response).to have_http_status(:success)
        expect(JSON.parse(response.body)['result']['nucleus']).to eq('1H')
      end
    end

    context 'when the LLM provider call fails (e.g. rate limit, timeout, invalid JSON)' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions").to_return(status: 503, body: 'high demand')
        allow(Message).to receive(:create_msg_notification)
      end

      it 'returns 502' do
        post '/api/v1/llm/spectral/extract',
             params: { content: 'MS (ESI, H2O), m/z (%): 301/303 (4/4) [M-Br]+.' }.to_json, headers: headers

        expect(response).to have_http_status(:bad_gateway)
      end

      it 'persists a failure notification (so it shows up in the System Notification panel, ' \
         'not just as a transient toast that disappears when dismissed)' do
        expect(Message).to receive(:create_msg_notification)
          .with(hash_including(message_content: hash_including('level' => 'error')))

        post '/api/v1/llm/spectral/extract',
             params: { content: 'MS (ESI, H2O), m/z (%): 301/303 (4/4) [M-Br]+.' }.to_json, headers: headers
      end
    end

    context 'with blank content' do
      before { allow(Message).to receive(:create_msg_notification) }

      it 'returns 422' do
        post '/api/v1/llm/spectral/extract', params: { content: '' }.to_json, headers: headers
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'persists a failure notification too — the frontend no longer shows its own toast ' \
         'for any failure, so every path here must be backed by one' do
        expect(Message).to receive(:create_msg_notification)
          .with(hash_including(message_content: hash_including('level' => 'error')))
        post '/api/v1/llm/spectral/extract', params: { content: '' }.to_json, headers: headers
      end
    end

    context 'when no provider is configured' do
      before do
        provider.update!(enabled: false)
        allow(Message).to receive(:create_msg_notification)
      end

      it 'returns 422 with a helpful message' do
        post '/api/v1/llm/spectral/extract',
             params: { content: '1H NMR δ = 7.2 (s, 1H).' }.to_json, headers: headers

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to match(/provider/i)
      end

      it 'persists a failure notification (so it shows up in the System Notification panel, ' \
         'not just as a transient toast)' do
        expect(Message).to receive(:create_msg_notification)
          .with(hash_including(message_content: hash_including('level' => 'error')))

        post '/api/v1/llm/spectral/extract',
             params: { content: '1H NMR δ = 7.2 (s, 1H).' }.to_json, headers: headers
      end
    end

    # execution_mode is normally "inline" for spectral_extraction (see
    # config/llm_tasks/spectral_extraction.yml) — there is no client-side way to
    # choose async. Stub LlmTaskDefinition#async? to exercise that branch as an
    # ELN installation would configure it, without touching the shipped YAML.
    context 'when the task is configured with execution_mode: async' do
      before do
        allow_any_instance_of(Chemotion::LlmTaskDefinition).to receive(:async?).and_return(true)
        allow(Message).to receive(:create_msg_notification)
      end

      let(:collection) { create(:collection, user: user) }
      let(:sample)     { create(:sample, collections: [collection]) }
      let(:container)  { sample.container.descendants.find_by(container_type: 'analysis') }

      context 'when the current user owns the container (via its element collection)' do
        it 'enqueues StructureSpectralDataJob and returns queued: true — no result computed inline' do
          expect(StructureSpectralDataJob).to receive(:perform_later)
            .with(container_id: container.id, user_id: user.id)

          post '/api/v1/llm/spectral/extract',
               params: { content: 'ignored for async', container_id: container.id }.to_json, headers: headers

          expect(response).to have_http_status(:success)
          expect(JSON.parse(response.body)['queued']).to be true
        end

        it 'does not itself persist a notification — the job persists its own on completion' do
          expect(Message).not_to receive(:create_msg_notification)

          post '/api/v1/llm/spectral/extract',
               params: { content: 'ignored for async', container_id: container.id }.to_json, headers: headers
        end
      end

      context 'when no container_id is given (analysis not saved yet)' do
        it 'returns 422 asking the user to save first' do
          post '/api/v1/llm/spectral/extract', params: { content: 'x' }.to_json, headers: headers

          expect(response).to have_http_status(:unprocessable_entity)
          expect(JSON.parse(response.body)['error']).to match(/must be saved/i)
        end

        it 'persists a failure notification — the frontend shows no toast of its own for this' do
          expect(Message).to receive(:create_msg_notification)
            .with(hash_including(message_content: hash_including('level' => 'error')))
          post '/api/v1/llm/spectral/extract', params: { content: 'x' }.to_json, headers: headers
        end
      end

      context 'when the container does not belong to the current user' do
        let(:other_user)       { create(:person) }
        let(:other_collection) { create(:collection, user: other_user) }
        let(:other_sample)     { create(:sample, collections: [other_collection]) }
        let(:other_container)  { other_sample.container.descendants.find_by(container_type: 'analysis') }

        it 'returns 401 and does not enqueue anything' do
          expect(StructureSpectralDataJob).not_to receive(:perform_later)

          post '/api/v1/llm/spectral/extract',
               params: { content: 'x', container_id: other_container.id }.to_json, headers: headers

          expect(response).to have_http_status(:unauthorized)
        end

        it 'persists a failure notification' do
          expect(Message).to receive(:create_msg_notification)
            .with(hash_including(message_content: hash_including('level' => 'error')))

          post '/api/v1/llm/spectral/extract',
               params: { content: 'x', container_id: other_container.id }.to_json, headers: headers
        end
      end

      context 'when the container does not exist' do
        it 'returns 404' do
          post '/api/v1/llm/spectral/extract', params: { content: 'x', container_id: -1 }.to_json, headers: headers
          expect(response).to have_http_status(:not_found)
        end

        it 'persists a failure notification' do
          expect(Message).to receive(:create_msg_notification)
            .with(hash_including(message_content: hash_including('level' => 'error')))
          post '/api/v1/llm/spectral/extract', params: { content: 'x', container_id: -1 }.to_json, headers: headers
        end
      end
    end
  end
end
