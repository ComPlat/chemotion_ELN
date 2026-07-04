# frozen_string_literal: true

# Admin-managed (global) LLM providers. A single enabled row acts as the
# institution's shared provider; users delegate to it unless they configure a
# personal endpoint (see user_llm_settings).
class CreateLlmProviders < ActiveRecord::Migration[6.1]
  def change
    create_table :llm_providers do |t|
      t.string   :name, null: false
      # Legacy vendor discriminator — kept nullable for backward compatibility;
      # the wire protocol is now carried by :api_protocol below.
      t.string   :provider_type
      t.string   :base_url
      # Encrypted API key — decrypt/encrypt handled by the EncryptsApiKey concern.
      t.text     :api_key_enc
      t.string   :default_model
      # Wire protocol spoken by this endpoint: openai | anthropic | gemini.
      t.string   :api_protocol, null: false, default: 'openai'
      # Reserved for a future per-user provider design (currently only 'global').
      t.string   :scope, null: false, default: 'global'
      t.bigint   :user_id
      t.boolean  :enabled, null: false, default: true
      t.timestamps null: false
    end

    add_index :llm_providers, :scope
    add_index :llm_providers, :user_id
    add_foreign_key :llm_providers, :users, column: :user_id, on_delete: :cascade
  end
end
