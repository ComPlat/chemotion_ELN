# frozen_string_literal: true

# Who may use an institution provider, and which of its models.
#
# One row is one rule about one target:
#   model nil    → the provider as a whole
#   model 'x'    → just that model of that provider
#
# The rule itself uses the Matrice semantics admins already know:
#   enabled true  → everyone, minus exclude_ids
#   enabled false → only include_ids
#
# Rules narrow the aiGlobalProvider gate; they never widen it. A target with no
# row is ungated, unless the provider is marked restrict_models — then a model
# needs a row to be offered at all.
class CreateLlmProviderGrants < ActiveRecord::Migration[6.1]
  def change
    create_table :llm_provider_grants do |t|
      t.bigint  :llm_provider_id, null: false

      # Null = this rule is about the provider itself, not one of its models.
      t.string  :model

      t.boolean :enabled,     null: false, default: true
      t.integer :include_ids, array: true, default: []
      t.integer :exclude_ids, array: true, default: []

      t.timestamps null: false
    end

    # One rule per target: a second rule for the same model could only contradict
    # the first. Postgres treats NULLs as distinct, so the provider-level rule
    # gets its own partial index.
    add_index :llm_provider_grants, %i[llm_provider_id model], unique: true,
                                                               where: 'model IS NOT NULL',
                                                               name: 'index_llm_provider_grants_on_model'
    add_index :llm_provider_grants, :llm_provider_id, unique: true,
                                                      where: 'model IS NULL',
                                                      name: 'index_llm_provider_grants_on_provider'
    add_foreign_key :llm_provider_grants, :llm_providers, on_delete: :cascade
  end
end
