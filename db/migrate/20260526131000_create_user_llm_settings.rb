# frozen_string_literal: true

# A user's LLM preference — NOT a provider. It answers one question: where does a
# task go when it names no provider of its own?
#
#   provider_type 'global' → institution_llm_provider, one of the institution's
#                            (llm_providers scope 'global')
#   provider_type 'custom' → default_llm_provider, one of the user's own
#                            (llm_providers scope 'user')
class CreateUserLlmSettings < ActiveRecord::Migration[6.1]
  def change
    create_table :user_llm_settings do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }, index: { unique: true }

      # 'global' → delegate to the admin-configured institution provider (default)
      # 'custom' → use one of the user's own providers
      t.string  :provider_type, null: false, default: 'global'

      # Which of the user's own providers serves a task that names none. Only
      # meaningful when provider_type == 'custom'.
      #
      # nullify, not cascade: losing the provider must not delete the user's
      # preference row — they fall back to the institution provider.
      t.bigint  :default_llm_provider_id

      # Which of the institution's providers serves a task that names none.
      # Only meaningful when provider_type == 'global'; blank means the first.
      t.bigint  :institution_llm_provider_id

      # Reserved per-user enable flag.
      t.boolean :enabled, null: false, default: true

      t.timestamps
    end

    add_index :user_llm_settings, :default_llm_provider_id
    add_index :user_llm_settings, :institution_llm_provider_id
    add_foreign_key :user_llm_settings, :llm_providers,
                    column: :default_llm_provider_id, on_delete: :nullify
    add_foreign_key :user_llm_settings, :llm_providers,
                    column: :institution_llm_provider_id, on_delete: :nullify
  end
end
