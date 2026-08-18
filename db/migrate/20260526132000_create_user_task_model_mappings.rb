# frozen_string_literal: true

# One task's routing override: run this task on this provider, on this model.
# Both parts are optional on their own — provider only means "that provider, on
# its own default model"; model only means "my default provider, on that model".
class CreateUserTaskModelMappings < ActiveRecord::Migration[6.1]
  def change
    create_table :user_task_model_mappings do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }

      # Identifies the LLM task (e.g. 'sds_extraction', 'nmr_structuring').
      # SF-04 (Task Registry) is the authoritative source of valid task names.
      t.string :task_name, null: false

      # The model identifier to use for this task (e.g. 'kit.qwen3.5-397b-A17b').
      # Null when the override names only a provider.
      t.string :model

      # The provider to run this task on; null = the user's default provider.
      #
      # cascade: an override that names a deleted provider is meaningless, and
      # keeping the model string alone would silently point it at another one.
      t.bigint :llm_provider_id

      t.timestamps
    end

    add_index :user_task_model_mappings, %i[user_id task_name], unique: true
    add_index :user_task_model_mappings, :llm_provider_id
    add_foreign_key :user_task_model_mappings, :llm_providers,
                    column: :llm_provider_id, on_delete: :cascade
  end
end
