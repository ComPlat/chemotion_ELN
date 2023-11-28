# frozen_string_literal: true

class CreateReactionProcessSteps < ActiveRecord::Migration[6.1]
  def change
    create_table :reaction_process_steps, id: :uuid do |t|
      t.uuid :reaction_process_id
      t.uuid :vessel_id

      t.string :name
      t.integer :position
      t.boolean :locked

      t.timestamps
    end
  end
end
