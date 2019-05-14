# frozen_string_literal: true

# migration for prediction table
class CreatePredictions < ActiveRecord::Migration
  def change
    create_table :predictions do |t|
      t.references :predictable, polymorphic: true, index: true

      t.jsonb :decision, null: false, default: '{}'

      t.timestamps
    end

    add_index :predictions, :decision, using: :gin
  end
end
