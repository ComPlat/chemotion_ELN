# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'

# LlmClient talks to an LLM chat API using one of three wire protocols, selected
# by +protocol+:
#
#   'openai'    — the Chat Completions API: POST /v1/chat/completions with a Bearer
#                 key. Named after the endpoint rather than a vendor, because that
#                 is what it identifies: OpenAI, KIT KI-Toolbox, Azure (key proxy),
#                 vLLM, Ollama, LM Studio all serve it, as do the compatibility
#                 endpoints Anthropic and Google expose alongside their own APIs.
#   'anthropic' — native Anthropic Messages API: POST /v1/messages with the
#                 x-api-key + anthropic-version headers.
#   'gemini'    — native Google Gemini API: POST /v1beta/models/{model}:generateContent
#                 with the x-goog-api-key header.
#
# Uses Ruby stdlib Net::HTTP — no additional gems required.
#
# Usage:
#   client = LlmClient.new(
#     base_url: 'https://api.anthropic.com',
#     api_key:  'sk-ant-...',
#     model:    'claude-opus-4-8',
#     protocol: 'anthropic',
#   )
#   content = client.chat(messages: [{ role: 'user', content: 'Hello' }])
#
class LlmClient
  PROTOCOLS = %w[openai anthropic gemini].freeze

  # Sensible default endpoints per protocol when the caller leaves base_url blank.
  DEFAULT_BASE_URLS = {
    'anthropic' => 'https://api.anthropic.com',
    'gemini'    => 'https://generativelanguage.googleapis.com',
  }.freeze

  ANTHROPIC_VERSION = '2023-06-01'

  # The finish/stop reason from the most recent #chat call (e.g. 'stop',
  # 'length'). 'length' with empty content means the model was cut off at the
  # token limit — the caller can retry with a larger max_tokens.
  attr_reader :last_finish_reason

  def initialize(base_url:, api_key:, model:, timeout: 120, protocol: 'openai')
    @protocol = PROTOCOLS.include?(protocol.to_s) ? protocol.to_s : 'openai'
    resolved  = base_url.presence || DEFAULT_BASE_URLS[@protocol]
    @uri      = URI.parse(resolved.to_s.chomp('/'))
    @api_key  = api_key
    @model    = model
    @timeout  = timeout
    @last_finish_reason = nil
  end

  # Send a chat request and return the assistant message content string.
  #
  # @param messages    [Array<Hash>]  Array of {role:, content:} hashes. Roles may
  #                                    be 'system' / 'user' / 'assistant'; each
  #                                    adapter maps them to its own convention.
  # @param temperature [Float]        Sampling temperature (ignored on anthropic —
  #                                    newer Claude models reject it).
  # @param max_tokens  [Integer, nil] Cap on response tokens; nil = provider default
  #                                    (anthropic requires one, so a default is used).
  # @param json_mode   [Boolean]      Ask the provider to return valid JSON.
  # @return [String]                  The assistant's reply text.
  #
  # @raise [Errors::LlmNotConfiguredError]  when no model is set
  # @raise [Errors::LlmAuthenticationError] on 401/403
  # @raise [Errors::LlmRateLimitError]      on 429
  # @raise [Errors::LlmTimeoutError]        on connection/read timeout
  # @raise [Errors::LlmProviderError]       on any other HTTP/network error
  def chat(messages:, temperature: 0.1, max_tokens: nil, json_mode: false)
    ensure_api_key_present!
    ensure_model_present!
    request  = build_chat_request(messages, temperature, max_tokens, json_mode)
    response = http_client.request(request)
    handle_response(response)
  # Timeouts and transport failures (refused, reset, DNS, EOF) are reported the
  # same way: the request never produced an answer and retrying may help.
  rescue Net::ReadTimeout, Net::OpenTimeout,
         Errno::ECONNREFUSED, SocketError, Errno::ECONNRESET, EOFError => e
    raise Errors::LlmTimeoutError, "LLM request timed out: #{e.message}"
  end

  # Fetch the list of available model IDs from the provider. Returns an array of
  # model ID strings, or [] on any error.
  #
  # @return [Array<String>]
  def list_models
    response = http_client.request(build_models_request)
    return [] unless response.code.to_i == 200

    parse_models(JSON.parse(response.body))
  rescue StandardError
    []
  end

  private

  # Fail fast with a clear message when a key is required but missing, rather than
  # letting the provider return an opaque 401 for an empty "Bearer " header.
  # Local Chat Completions servers (e.g. Ollama) legitimately need no key, so we
  # only hard-fail for protocols that always require one.
  def ensure_api_key_present!
    return if @api_key.present?
    return if @protocol == 'openai'

    raise Errors::LlmAuthenticationError,
          "No API key is configured for this #{@protocol} provider. Add the provider's API key."
  end

  # A blank model is a configuration mistake, not a provider failure, and asking
  # the provider about it teaches the user nothing: KIT KI-Toolbox (Open WebUI)
  # answers a model-less request with HTTP 400 "Invalid input of type:
  # 'NoneType'. Convert to a bytes, string, int or float first." — an error from
  # deep inside its own internals that never mentions the field that is missing.
  # Fail here instead, naming the field to fill in.
  def ensure_model_present!
    return if @model.present?

    raise Errors::LlmNotConfiguredError,
          'No model is set for this provider. Enter a default model ' \
          '(for example kit.qwen3.5-397b-A17b), then test the connection again.'
  end

  # ── Request building ────────────────────────────────────────────────────────

  def build_chat_request(messages, temperature, max_tokens, json_mode)
    case @protocol
    when 'anthropic' then build_anthropic_chat(messages, max_tokens, json_mode)
    when 'gemini'    then build_gemini_chat(messages, temperature, max_tokens, json_mode)
    else                  build_openai_chat(messages, temperature, max_tokens, json_mode)
    end
  end

  def build_models_request
    listing_path = @protocol == 'gemini' ? '/v1beta/models' : '/v1/models'
    req = Net::HTTP::Get.new("#{@uri.path}#{listing_path}")

    case @protocol
    when 'gemini'    then req['x-goog-api-key'] = @api_key if @api_key.present?
    when 'anthropic' then apply_anthropic_headers(req)
    else
      req['Authorization'] = "Bearer #{@api_key}" if @api_key.present?
      req['Content-Type']  = 'application/json'
    end

    req
  end

  # ── Chat Completions adapter ────────────────────────────────────────────────

  def build_openai_chat(messages, temperature, max_tokens, json_mode)
    body = { model: @model, messages: messages, temperature: temperature }
    body[:max_tokens]      = max_tokens if max_tokens
    body[:response_format] = { type: 'json_object' } if json_mode

    req = Net::HTTP::Post.new("#{@uri.path}/v1/chat/completions")
    req['Authorization'] = "Bearer #{@api_key}"
    req['Content-Type']  = 'application/json'
    req.body = body.to_json
    req
  end

  # ── Anthropic Messages adapter ──────────────────────────────────────────────

  # Both native APIs take the system prompt as a dedicated top-level field rather
  # than as a message in the array, so it is lifted out of the conversation.
  def system_prompt_from(messages)
    messages.select { |m| m[:role].to_s == 'system' }.pluck(:content).join("\n\n").presence
  end

  # The conversation without the system message(s); each adapter maps the roles.
  def conversation_from(messages)
    messages.reject { |m| m[:role].to_s == 'system' }
  end

  # temperature is not accepted here: newer Claude models reject it, so
  # build_chat_request deliberately does not pass one.
  def build_anthropic_chat(messages, max_tokens, _json_mode)
    system_prompt = system_prompt_from(messages)
    convo = conversation_from(messages)
            .map { |m| { role: m[:role].to_s == 'assistant' ? 'assistant' : 'user', content: m[:content] } }

    # max_tokens is REQUIRED by the Anthropic API. temperature is intentionally
    # omitted — newer Claude models (Opus 4.7+, Sonnet 5, Fable 5) reject it.
    body = { model: @model, max_tokens: max_tokens || 4096, messages: convo }
    body[:system] = system_prompt if system_prompt

    req = Net::HTTP::Post.new("#{@uri.path}/v1/messages")
    apply_anthropic_headers(req)
    req.body = body.to_json
    req
  end

  def apply_anthropic_headers(req)
    req['x-api-key']         = @api_key if @api_key.present?
    req['anthropic-version'] = ANTHROPIC_VERSION
    req['Content-Type']      = 'application/json'
  end

  # ── Google Gemini adapter ───────────────────────────────────────────────────

  def build_gemini_chat(messages, temperature, max_tokens, json_mode)
    system_prompt = system_prompt_from(messages)
    contents = conversation_from(messages).map do |m|
      { role: m[:role].to_s == 'assistant' ? 'model' : 'user', parts: [{ text: m[:content].to_s }] }
    end

    generation_config = { temperature: temperature }
    generation_config[:maxOutputTokens] = max_tokens if max_tokens
    generation_config[:responseMimeType] = 'application/json' if json_mode

    body = { contents: contents, generationConfig: generation_config }
    body[:systemInstruction] = { parts: [{ text: system_prompt }] } if system_prompt

    req = Net::HTTP::Post.new("#{@uri.path}/v1beta/models/#{@model}:generateContent")
    req['x-goog-api-key'] = @api_key if @api_key.present?
    req['Content-Type']   = 'application/json'
    req.body = body.to_json
    req
  end

  # ── Response handling ───────────────────────────────────────────────────────

  def handle_response(response)
    case response.code.to_i
    when 200
      parse_content(response.body)
    when 401, 403
      raise Errors::LlmAuthenticationError,
            "LLM API authentication failed (#{response.code}). Check the API key and endpoint. " \
            "Provider response: #{response.body.to_s[0, 300]}"
    when 429
      raise Errors::LlmRateLimitError, 'LLM API rate limit exceeded (429). Retry later.'
    else
      raise Errors::LlmProviderError,
            "LLM API error (#{response.code}): #{response.body.to_s[0, 200]}"
    end
  end

  def parse_content(body_str)
    parsed = JSON.parse(body_str)
    case @protocol
    when 'anthropic' then parse_anthropic_content(parsed, body_str)
    when 'gemini'    then parse_gemini_content(parsed, body_str)
    else                  parse_openai_content(parsed, body_str)
    end
  rescue JSON::ParserError => e
    raise Errors::LlmProviderError, "Failed to parse LLM response as JSON: #{e.message}"
  end

  def parse_openai_content(parsed, body_str)
    choice = parsed.dig('choices', 0)
    raise_unexpected_shape(body_str) unless choice.is_a?(Hash)

    @last_finish_reason = choice['finish_reason']
    # `content` can be nil/empty when a reasoning model spends its whole token
    # budget on reasoning (finish_reason: "length"). That is still a valid,
    # authenticated response — return '' instead of raising, and let the caller
    # decide whether to retry (see #last_finish_reason).
    (choice['message'] || {})['content'].to_s
  end

  def parse_anthropic_content(parsed, body_str)
    blocks = parsed['content']
    raise_unexpected_shape(body_str) unless blocks.is_a?(Array)

    @last_finish_reason = parsed['stop_reason']
    blocks.select { |b| b.is_a?(Hash) && b['type'] == 'text' }.pluck('text').join
  end

  def parse_gemini_content(parsed, body_str)
    @last_finish_reason = parsed.dig('candidates', 0, 'finishReason')
    parts = parsed.dig('candidates', 0, 'content', 'parts')
    raise_unexpected_shape(body_str) unless parts.is_a?(Array)

    parts.filter_map { |p| p['text'] if p.is_a?(Hash) }.join
  end

  def raise_unexpected_shape(body_str)
    raise Errors::LlmProviderError,
          "Unexpected response shape from LLM: #{body_str.to_s[0, 200]}"
  end

  # ── Model-list parsing ──────────────────────────────────────────────────────

  def parse_models(data)
    entries = @protocol == 'gemini' ? data['models'] : (data['data'] || data['models'])
    return [] unless entries.is_a?(Array)

    entries.filter_map { |entry| model_id_from(entry) }.sort
  end

  # Gemini reports names like "models/gemini-2.5-pro"; the others use a bare `id`.
  # Stripping the prefix unconditionally is safe — no other provider uses it.
  def model_id_from(entry)
    return nil unless entry.is_a?(Hash)

    (entry['id'] || entry['name'])&.delete_prefix('models/')
  end

  def http_client
    http              = Net::HTTP.new(@uri.host, @uri.port)
    http.use_ssl      = (@uri.scheme == 'https')
    http.read_timeout = @timeout
    http.open_timeout = 10
    http
  end
end
