# frozen_string_literal: true

class CreateUserTaskModelMappings < ActiveRecord::Migration[6.1]
  def change
    create_table :user_task_model_mappings do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }

      # Identifies the LLM task (e.g. 'sds_extraction', 'nmr_structuring').
      # SF-04 (Task Registry) is the authoritative source of valid task names.
      t.string :task_name, null: false

      # The model identifier to use for this task (e.g. 'kit.qwen3.5-397b-A17b')
      t.string :model, null: false

      t.timestamps
    end

    add_index :user_task_model_mappings, %i[user_id task_name], unique: true
  end
end
