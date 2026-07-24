# frozen_string_literal: true

require 'net/http'
require 'uri'
require 'json'

# LlmClient talks to an LLM chat API using one of three wire protocols, selected
# by +protocol+:
#
#   'openai'    — OpenAI-compatible POST /v1/chat/completions with a Bearer key.
#                 Covers OpenAI, KIT KI-Toolbox, Azure (key proxy), vLLM, Ollama,
#                 and the OpenAI-compatible endpoints that Anthropic and Google
#                 also expose.
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
  # @raise [Errors::LlmAuthenticationError] on 401/403
  # @raise [Errors::LlmRateLimitError]      on 429
  # @raise [Errors::LlmTimeoutError]        on connection/read timeout
  # @raise [Errors::LlmProviderError]       on any other HTTP/network error
  def chat(messages:, temperature: 0.1, max_tokens: nil, json_mode: false)
    ensure_api_key_present!
    request  = build_chat_request(messages, temperature, max_tokens, json_mode)
    response = http_client.request(request)
    handle_response(response)
  rescue Net::ReadTimeout, Net::OpenTimeout => e
    raise Errors::LlmTimeoutError, "LLM request timed out: #{e.message}"
  rescue Errno::ECONNREFUSED, SocketError, Errno::ECONNRESET, EOFError => e
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
  # OpenAI-compatible local servers (e.g. Ollama) legitimately need no key, so we
  # only hard-fail for protocols that always require one.
  def ensure_api_key_present!
    return if @api_key.present?
    return if @protocol == 'openai'

    raise Errors::LlmAuthenticationError,
          "No API key is configured for this #{@protocol} provider. Add the provider's API key."
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
    case @protocol
    when 'gemini'
      req = Net::HTTP::Get.new("#{@uri.path}/v1beta/models")
      req['x-goog-api-key'] = @api_key if @api_key.present?
      req
    when 'anthropic'
      req = Net::HTTP::Get.new("#{@uri.path}/v1/models")
      apply_anthropic_headers(req)
      req
    else
      req = Net::HTTP::Get.new("#{@uri.path}/v1/models")
      req['Authorization'] = "Bearer #{@api_key}" if @api_key.present?
      req['Content-Type']  = 'application/json'
      req
    end
  end

  # ── OpenAI-compatible adapter ───────────────────────────────────────────────

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

  def build_anthropic_chat(messages, _temperature, max_tokens, _json_mode)
    system_prompt = messages.select { |m| m[:role].to_s == 'system' }
                            .map { |m| m[:content] }.join("\n\n").presence
    convo = messages.reject { |m| m[:role].to_s == 'system' }
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
    system_prompt = messages.select { |m| m[:role].to_s == 'system' }
                            .map { |m| m[:content] }.join("\n\n").presence
    contents = messages.reject { |m| m[:role].to_s == 'system' }.map do |m|
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
    blocks.select { |b| b.is_a?(Hash) && b['type'] == 'text' }
          .map { |b| b['text'] }.join
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
    case @protocol
    when 'gemini'
      # names look like "models/gemini-2.5-pro" — strip the prefix
      (data['models'] || []).filter_map { |m| m['name']&.delete_prefix('models/') }.sort
    when 'anthropic'
      (data['data'] || []).filter_map { |m| m['id'] }.sort
    else
      (data['data'] || data['models'] || []).filter_map { |m| m['id'] || m['name'] }.sort
    end
  end

  def http_client
    http              = Net::HTTP.new(@uri.host, @uri.port)
    http.use_ssl      = (@uri.scheme == 'https')
    http.read_timeout = @timeout
    http.open_timeout = 10
    http
  end
end
