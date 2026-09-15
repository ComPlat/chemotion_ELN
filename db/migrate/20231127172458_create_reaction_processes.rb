# frozen_string_literal: true

class CreateReactionProcesses < ActiveRecord::Migration[6.1]
  def change
    create_table :reaction_processes, id: :uuid do |t|
      t.integer :reaction_id

      t.jsonb :default_conditions

      t.timestamps
    end
  end
end
