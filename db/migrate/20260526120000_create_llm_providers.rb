# frozen_string_literal: true

# Every endpoint an LLM request can be sent to.
#
#   scope 'global' — the institution's provider, configured by an admin and
#                    shared by every user the aiGlobalProvider gate allows.
#                    user_id is nil.
#   scope 'user'   — one of a user's own providers. Belongs to user_id and is
#                    reachable by nobody else. A user may have several, each with
#                    its own protocol, model and key, and route individual tasks
#                    at them (see user_task_model_mappings).
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
      # Who owns this provider: 'global' (institution) or 'user'.
      t.string   :scope, null: false, default: 'global'
      t.bigint   :user_id
      t.boolean  :enabled, null: false, default: true
      # Whether only the models named in llm_provider_grants may be used here.
      # false = every model the provider lists, minus whatever a grant excludes.
      t.boolean  :restrict_models, null: false, default: false
      t.timestamps null: false
    end

    add_index :llm_providers, :scope
    add_index :llm_providers, :user_id
    # Every personal-provider lookup filters on both columns.
    add_index :llm_providers, %i[user_id scope]
    add_foreign_key :llm_providers, :users, column: :user_id, on_delete: :cascade
  end
end
