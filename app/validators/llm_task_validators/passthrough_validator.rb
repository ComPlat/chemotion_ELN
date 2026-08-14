# frozen_string_literal: true

module LlmTaskValidators
  # Accepts whatever the model returned. For tasks that declare no
  # validator_class, or where any non-empty result is usable.
  class PassthroughValidator < Base
    def validate!(data)
      data
    end
  end
end
