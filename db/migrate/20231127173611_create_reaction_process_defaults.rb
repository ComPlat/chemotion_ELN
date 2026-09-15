# frozen_string_literal: true

class CreateReactionProcessDefaults < ActiveRecord::Migration[6.1]
  def change
    create_table :reaction_process_defaults, id: :uuid do |t|
      t.integer :user_id

      t.jsonb :default_conditions

      t.timestamps
    end
  end
end
