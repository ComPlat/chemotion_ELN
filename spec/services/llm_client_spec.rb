# frozen_string_literal: true

require 'rails_helper'

RSpec.describe LlmClient do
  let(:base_url) { 'https://ki-toolbox.scc.kit.edu/api' }
  let(:api_key)  { 'sk-test-key' }
  let(:model)    { 'kit.qwen3.5-397b-A17b' }
  let(:client)   { described_class.new(base_url: base_url, api_key: api_key, model: model) }

  let(:messages) { [{ role: 'user', content: 'What is phenol?' }] }

  let(:success_body) do
    {
      'choices' => [
        { 'message' => { 'role' => 'assistant', 'content' => 'Phenol is an aromatic compound.' } },
      ],
    }.to_json
  end

  describe '#chat' do
    context 'when the provider responds successfully' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 200, body: success_body, headers: { 'Content-Type' => 'application/json' })
      end

      it 'returns the assistant message content' do
        result = client.chat(messages: messages)
        expect(result).to eq('Phenol is an aromatic compound.')
      end

      it 'sends the correct Authorization header' do
        client.chat(messages: messages)
        expect(WebMock).to have_requested(:post, "#{base_url}/v1/chat/completions")
          .with(headers: { 'Authorization' => "Bearer #{api_key}" })
      end

      it 'sends model and messages in the request body' do
        client.chat(messages: messages)
        expect(WebMock).to(have_requested(:post, "#{base_url}/v1/chat/completions")
          .with { |req| JSON.parse(req.body)['model'] == model })
      end

      it 'includes response_format when json_mode is true' do
        client.chat(messages: messages, json_mode: true)
        expect(WebMock).to(have_requested(:post, "#{base_url}/v1/chat/completions")
          .with { |req| JSON.parse(req.body)['response_format'] == { 'type' => 'json_object' } })
      end
    end

    context 'when the provider returns 401' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 401, body: '{"error": "Invalid API key"}')
      end

      it 'raises LlmAuthenticationError including the provider response body' do
        expect { client.chat(messages: messages) }
          .to raise_error(Errors::LlmAuthenticationError, /authentication failed.*Invalid API key/m)
      end
    end

    context 'when a key-requiring protocol has no api_key' do
      let(:keyless) do
        described_class.new(base_url: 'https://api.anthropic.com', api_key: nil,
                            model: 'claude-opus-4-8', protocol: 'anthropic')
      end

      it 'fails fast with a clear message before any request' do
        expect { keyless.chat(messages: messages, max_tokens: 10) }
          .to raise_error(Errors::LlmAuthenticationError, /No API key is configured/)
        expect(WebMock).not_to have_requested(:post, /api\.anthropic\.com/)
      end
    end

    context 'when no model is configured' do
      let(:modelless) { described_class.new(base_url: base_url, api_key: api_key, model: '') }

      it 'fails fast with a message naming the missing field, before any request' do
        expect { modelless.chat(messages: messages) }
          .to raise_error(Errors::LlmNotConfiguredError, /No model is set/)
        expect(WebMock).not_to have_requested(:post, "#{base_url}/v1/chat/completions")
      end

      it 'treats nil the same as blank' do
        nil_model = described_class.new(base_url: base_url, api_key: api_key, model: nil)
        expect { nil_model.chat(messages: messages) }
          .to raise_error(Errors::LlmNotConfiguredError)
      end
    end

    context 'when the provider returns 429' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 429, body: '{"error": "Too Many Requests"}')
      end

      it 'raises LlmRateLimitError' do
        expect { client.chat(messages: messages) }
          .to raise_error(Errors::LlmRateLimitError)
      end
    end

    context 'when a connection timeout occurs' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_timeout
      end

      it 'raises LlmTimeoutError' do
        expect { client.chat(messages: messages) }
          .to raise_error(Errors::LlmTimeoutError, /timed out/)
      end
    end

    context 'when the provider returns an unexpected response shape' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions")
          .to_return(status: 200, body: '{"unexpected": "format"}')
      end

      it 'raises LlmProviderError' do
        expect { client.chat(messages: messages) }
          .to raise_error(Errors::LlmProviderError, /Unexpected response shape/)
      end
    end

    context 'when the provider answers with JSON that is not an object' do
      before do
        stub_request(:post, "#{base_url}/v1/chat/completions").to_return(status: 200, body: '[1,2]')
      end

      it 'raises LlmProviderError' do
        expect { client.chat(messages: messages) }
          .to raise_error(Errors::LlmProviderError, /Unexpected response shape/)
      end
    end

    [OpenSSL::SSL::SSLError, Errno::EHOSTUNREACH, Errno::ETIMEDOUT, Net::HTTPBadResponse,
     Net::WriteTimeout].each do |failure|
      context "when the connection fails with #{failure}" do
        before { stub_request(:post, "#{base_url}/v1/chat/completions").to_raise(failure) }

        it 'raises an LLM provider error' do
          expect { client.chat(messages: messages) }.to raise_error(Errors::LlmProviderError)
        end
      end
    end

    context 'when the response is larger than the client reads' do
      before do
        stub_const('LlmClient::Transport::MAX_RESPONSE_BYTES', 100)
        stub_request(:post, "#{base_url}/v1/chat/completions").to_return(status: 200, body: 'x' * 500)
      end

      it 'stops reading and raises LlmProviderError' do
        expect { client.chat(messages: messages) }.to raise_error(Errors::LlmProviderError, /larger than/)
      end
    end

    context 'when the provider trickles its answer past the timeout' do
      let(:server) { TCPServer.new('127.0.0.1', 0) }
      let(:trickler) do
        Thread.new do
          socket = server.accept
          socket.write("HTTP/1.1 200 OK\r\nContent-Length: 100\r\n\r\n")
          10.times do
            socket.write('x')
            sleep 0.4
          end
        rescue IOError, SystemCallError
          nil
        ensure
          socket&.close
        end
      end

      after do
        trickler.kill
        server.close
      end

      it 'gives up at the overall deadline, not per read' do
        trickler
        slow = described_class.new(base_url: "http://127.0.0.1:#{server.addr[1]}", api_key: api_key,
                                   model: model, timeout: 1)
        started = Process.clock_gettime(Process::CLOCK_MONOTONIC)

        expect { slow.chat(messages: messages) }.to raise_error(Errors::LlmTimeoutError, /timed out/)
        expect(Process.clock_gettime(Process::CLOCK_MONOTONIC) - started).to be < 3
      end
    end

    context 'with an IPv6 literal endpoint' do
      let(:v6_url) { 'http://[2001:db8::1]:8080' }

      before do
        stub_request(:post, "#{v6_url}/v1/chat/completions")
          .to_return(status: 200, body: success_body, headers: { 'Content-Type' => 'application/json' })
      end

      it 'connects to the address without its brackets' do
        allow(Net::HTTP).to receive(:new).and_call_original
        described_class.new(base_url: v6_url, api_key: api_key, model: model).chat(messages: messages)

        expect(Net::HTTP).to have_received(:new).with('2001:db8::1', 8080)
      end
    end

    context 'when a user endpoint would go through an HTTP proxy' do
      around do |example|
        saved = ENV.fetch('http_proxy', nil)
        ENV['http_proxy'] = 'http://proxy.example.org:3128'
        example.run
      ensure
        ENV['http_proxy'] = saved
      end

      before do
        allow(Addrinfo).to receive(:getaddrinfo).and_call_original
        allow(Addrinfo).to receive(:getaddrinfo).with('llm.example.org', nil, nil, :STREAM)
                                                .and_return([Addrinfo.tcp('93.184.216.34', 0)])
      end

      it 'refuses plain http, which the proxy would resolve again' do
        restricted = described_class.new(base_url: 'http://llm.example.org', api_key: api_key, model: model,
                                         restrict_endpoint: true)

        expect { restricted.chat(messages: messages) }.to raise_error(Errors::LlmNotConfiguredError, /https/)
      end
    end
  end

  describe '#chat with the anthropic protocol' do
    let(:anthropic_client) do
      described_class.new(base_url: 'https://api.anthropic.com', api_key: 'sk-ant',
                          model: 'claude-opus-4-8', protocol: 'anthropic')
    end
    let(:anthropic_body) do
      { 'content' => [{ 'type' => 'text', 'text' => 'Phenol is aromatic.' }] }.to_json
    end

    before do
      stub_request(:post, 'https://api.anthropic.com/v1/messages')
        .to_return(status: 200, body: anthropic_body, headers: { 'Content-Type' => 'application/json' })
    end

    it 'posts to /v1/messages and returns joined text blocks' do
      result = anthropic_client.chat(messages: messages, max_tokens: 100)
      expect(result).to eq('Phenol is aromatic.')
    end

    it 'sends the x-api-key and anthropic-version headers' do
      anthropic_client.chat(messages: messages, max_tokens: 100)
      expect(WebMock).to have_requested(:post, 'https://api.anthropic.com/v1/messages')
        .with(headers: { 'x-api-key' => 'sk-ant', 'anthropic-version' => '2023-06-01' })
    end

    it 'lifts the system role into the top-level system field' do
      anthropic_client.chat(
        messages:   [{ role: 'system', content: 'sys' }, { role: 'user', content: 'q' }],
        max_tokens: 100,
      )
      expect(WebMock).to(have_requested(:post, 'https://api.anthropic.com/v1/messages')
        .with do |req|
          body = JSON.parse(req.body)
          body['system'] == 'sys' &&
            body['messages'] == [{ 'role' => 'user', 'content' => 'q' }] &&
            body['max_tokens'] == 100 &&
            !body.key?('temperature')
        end)
    end

    it 'defaults the base URL to the official endpoint when blank' do
      client_no_url = described_class.new(base_url: '', api_key: 'sk-ant',
                                          model: 'claude-opus-4-8', protocol: 'anthropic')
      client_no_url.chat(messages: messages, max_tokens: 100)
      expect(WebMock).to have_requested(:post, 'https://api.anthropic.com/v1/messages')
    end
  end

  describe '#chat with the gemini protocol' do
    let(:gemini_client) do
      described_class.new(base_url: 'https://generativelanguage.googleapis.com', api_key: 'g-key',
                          model: 'gemini-2.5-pro', protocol: 'gemini')
    end
    let(:gemini_url) { 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent' }
    let(:gemini_body) do
      { 'candidates' => [{ 'content' => { 'parts' => [{ 'text' => 'Phenol is aromatic.' }] } }] }.to_json
    end

    before do
      stub_request(:post, gemini_url)
        .to_return(status: 200, body: gemini_body, headers: { 'Content-Type' => 'application/json' })
    end

    it 'posts to generateContent and returns candidate parts text' do
      result = gemini_client.chat(messages: messages, max_tokens: 100)
      expect(result).to eq('Phenol is aromatic.')
    end

    it 'sends the x-goog-api-key header' do
      gemini_client.chat(messages: messages, max_tokens: 100)
      expect(WebMock).to have_requested(:post, gemini_url)
        .with(headers: { 'x-goog-api-key' => 'g-key' })
    end

    it 'keeps the model name inside its one path segment' do
      stub_request(:post, /generativelanguage/).to_return(status: 200, body: gemini_body)
      sneaky = described_class.new(base_url: 'https://generativelanguage.googleapis.com', api_key: 'g-key',
                                   model: '../../admin?x=1', protocol: 'gemini')
      sneaky.chat(messages: messages, max_tokens: 100)

      expect(WebMock).to(have_requested(:post, /generativelanguage/)
        .with { |request| request.uri.path.start_with?('/v1beta/models/') && request.uri.query.nil? })
    end

    it 'reports a reply cut off at the token limit as empty output, not a broken one' do
      cut_off = { 'candidates' => [{ 'content' => { 'role' => 'model' }, 'finishReason' => 'MAX_TOKENS' }] }
      stub_request(:post, gemini_url).to_return(status: 200, body: cut_off.to_json)

      expect(gemini_client.chat(messages: messages, max_tokens: 100)).to eq('')
      expect(gemini_client.last_finish_reason).to eq('length')
    end
  end
end
