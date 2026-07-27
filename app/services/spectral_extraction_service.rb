# frozen_string_literal: true

# Converts one unstructured analytical measurement (NMR, MS/HRMS, IR, UV-Vis,
# HPLC/GC) into structured JSON, using the dynamic `spectral_extraction` LLM task.
#
# Flow:
#   1. Flatten the analysis content (Quill delta / JSON / string) to plain text
#   2. Detect the technique (from the analysis type, else the text) + NMR nucleus
#   3. Inject the technique-specific fragment (schema + worked example) into the
#      task prompt, filling {{nucleus}} for NMR
#   4. Run LlmTaskRunner (which resolves the provider/model, applies the model
#      fallback, and validates the output)
#   5. Return the structured result plus which model served it
#
# This is an INLINE task — a single measurement is small, so it runs synchronously
# (unlike SDS extraction, which is a background job over a whole PDF).
#
# Usage:
#   result = SpectralExtractionService.call(user: current_user, content: content, kind: kind)
#   result.data            # => structured Hash
#   result.technique_label # => "13C NMR"
#   result.model           # => "gemini-3.1-flash-lite"
#
class SpectralExtractionService
  TASK_NAME = 'spectral_extraction'

  # Raised for input problems (no content) that should surface to the user as a
  # 4xx rather than a provider error.
  class Error < StandardError; end

  Result = Struct.new(
    :technique, :technique_label, :nucleus, :model, :requested_model, :data,
    keyword_init: true,
  )

  def self.call(user:, content:, kind: nil)
    new(user: user, content: content, kind: kind).call
  end

  def initialize(user:, content:, kind: nil)
    @user    = user
    @content = content
    @kind    = kind
  end

  def call
    text = Chemotion::QuillDeltaText.to_text(@content).to_s.strip
    raise Error, 'No analysis content to structure.' if text.blank?

    detection = Chemotion::SpectralTechnique.detect(kind: @kind, text: text)
    task      = Chemotion::LlmTaskRegistry.find(TASK_NAME)

    instructions = task.technique_instructions(detection[:key])
                       .gsub('{{nucleus}}', detection[:nucleus].to_s)

    runner = LlmTaskRunner.new(
      task_name: TASK_NAME,
      user:      @user,
      context:   text,
      params: {
        technique_label:        detection[:label],
        technique_instructions: instructions,
      },
    )
    data = runner.run

    Result.new(
      technique:       detection[:key],
      technique_label: detection[:label],
      nucleus:         detection[:nucleus],
      model:           runner.model_used,
      requested_model: (runner.requested_model if runner.fell_back?),
      data:            data,
    )
  end
end
