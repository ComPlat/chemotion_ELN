# frozen_string_literal: true

# Per-user LLM preferences. Users either delegate to the institution's global
# provider or configure a personal endpoint + key.
class CreateUserLlmSettings < ActiveRecord::Migration[6.1]
  def change
    create_table :user_llm_settings do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: { unique: true }

      # 'global' → delegate to the admin-configured LlmProvider (default)
      # 'custom' → user-supplied endpoint (OpenAI-compatible, Anthropic or Gemini)
      t.string  :provider_type, null: false, default: 'global'

      # Custom endpoint URL (used when provider_type == 'custom')
      t.string  :base_url

      # Wire protocol for a custom endpoint: openai | anthropic | gemini.
      t.string  :api_protocol, null: false, default: 'openai'

      # Encrypted API key (nil = no key stored / use global)
      t.text    :api_key_enc

      # Default model to use when no task-specific mapping exists
      t.string  :default_model

      # Reserved per-user enable flag.
      t.boolean :enabled, null: false, default: true

      t.timestamps
    end
  end
end
