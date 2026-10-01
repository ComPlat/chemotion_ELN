/**
 * User-facing naming for the LLM wire protocols (`api_protocol` on LlmProvider /
 * UserLlmSetting). Shared by the admin provider form and the personal AI settings
 * form so the two never drift apart.
 *
 * Each option names the *API* a provider speaks, not the company that invented it:
 * an endpoint is chosen here because of the request/response format it accepts, and
 * for `openai` that format is spoken by a long list of services that have nothing
 * to do with OpenAI (KIT KI-Toolbox, vLLM, Ollama, LM Studio, Azure, …). Naming the
 * option after the vendor would tell those users, wrongly, that it is not for them;
 * "OpenAI-compatible" only says what it is compatible *with*, which is the same
 * problem one step removed. So the protocol is named after its endpoint —
 * `/v1/chat/completions`, universally called the Chat Completions API — and the
 * vendors that speak it are listed alongside.
 *
 * The stored values ('openai' / 'anthropic' / 'gemini') are internal identifiers
 * shared with LlmClient::PROTOCOLS and are deliberately left untouched.
 */

export const LLM_PROTOCOL_OPTIONS = [
  {
    value:      'openai',
    shortLabel: 'Chat Completions API',
    label:      'Chat Completions API (OpenAI, KI-Toolbox, vLLM, Ollama, LM Studio, Azure, …)',
  },
  {
    value:      'anthropic',
    shortLabel: 'Anthropic Messages API',
    label:      'Anthropic Messages API (Claude)',
  },
  {
    value:      'gemini',
    shortLabel: 'Google Gemini API',
    label:      'Google Gemini API',
  },
];

/** The short name of a protocol, for prose; falls back to the raw value. */
export const llmProtocolShortLabel = (value) => (
  LLM_PROTOCOL_OPTIONS.find((opt) => opt.value === value)?.shortLabel || value
);

/** The protocol that needs an explicit endpoint — the others default theirs. */
export const CHAT_COMPLETIONS_PROTOCOL = 'openai';
